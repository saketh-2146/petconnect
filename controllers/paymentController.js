import { supabase } from '../config/supabase.js';
import razorpay from '../config/razorpay.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';
import Joi from 'joi';

export const createOrderSchema = Joi.object({
  petId: Joi.string().uuid().required()
});

export const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required()
});

// @route   POST /api/payments/order
// @desc    Create a Razorpay order for purchasing a pet
export const createOrder = asyncHandler(async (req, res) => {
  const { petId } = req.body;

  // 1. Fetch pet and validate
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('*')
    .eq('id', petId)
    .single();

  if (petError || !pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }
  if (pet.listing_type !== 'sale') {
    return res.status(400).json({ error: 'This pet is listed for adoption, not for sale' });
  }
  if (pet.status !== 'available') {
    return res.status(400).json({ error: `This pet is currently ${pet.status}` });
  }

  // 2. Create Razorpay order (amount in paise)
  const amountInPaise = Math.round(pet.price * 100);
  
  const options = {
    amount: amountInPaise,
    currency: 'INR',
    receipt: `receipt_pet_${petId}`,
  };

  const razorpayOrder = await razorpay.orders.create(options);

  // 3. Create the order row in the database
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      buyer_id: req.user.id,
      pet_id: petId,
      amount: pet.price,
      status: 'created',
      razorpay_order_id: razorpayOrder.id
    }])
    .select()
    .single();

  if (orderError) throw Object.assign(new Error(orderError.message), { status: 500 });

  res.status(201).json({
    order,
    razorpayOrder,
    key_id: process.env.RAZORPAY_KEY_ID // Send Key ID so frontend can open Razorpay checkout
  });
});

// @route   POST /api/payments/verify
// @desc    Verify payment signature, update order and pet status
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // 1. Verify HMAC SHA256 Signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // 2. Database updates on success
    
    // Fetch order to get the pet_id
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();
      
    if (orderFetchError || !order) {
      return res.status(404).json({ error: 'Associated order not found in database' });
    }

    // Mark the order as paid
    await supabase
      .from('orders')
      .update({ status: 'paid', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id);

    // Mark the pet as sold
    await supabase
      .from('pets')
      .update({ status: 'sold' })
      .eq('id', order.pet_id);

    return res.status(200).json({ message: 'Payment verified successfully' });
  } else {
    // 3. Database updates on failure
    await supabase
      .from('orders')
      .update({ status: 'failed', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id);

    return res.status(400).json({ error: 'Payment verification failed: Invalid Signature' });
  }
});

// @route   POST /api/payments/webhook
// @desc    Razorpay webhook handler for async payment events
export const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Webhook secret is not configured.');
    return res.status(500).send('Webhook secret missing');
  }

  // Verify the signature using the raw body
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Parse the raw body back to JSON after verifying
  const event = JSON.parse(req.body);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const razorpay_order_id = payment.order_id;
    const razorpay_payment_id = payment.id;

    // Fetch order
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (orderFetchError || !order) {
      return res.status(200).json({ message: 'Order not found, ignoring webhook' });
    }

    // Idempotency check: ignore if already paid
    if (order.status === 'paid') {
      return res.status(200).json({ message: 'Order already marked as paid' });
    }

    // Update order status to paid
    await supabase
      .from('orders')
      .update({ status: 'paid', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id);

    // Update pet status to sold
    await supabase
      .from('pets')
      .update({ status: 'sold' })
      .eq('id', order.pet_id);
  }

  res.status(200).json({ status: 'ok' });
});

