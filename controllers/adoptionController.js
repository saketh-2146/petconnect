import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Joi from 'joi';

export const requestAdoptionSchema = Joi.object({
  message: Joi.string().max(1000).allow('').optional()
});

// @route   POST /api/adoptions/:petId
// @desc    Buyer requests to adopt a pet
export const requestAdoption = asyncHandler(async (req, res) => {
  const { petId } = req.params;
  const { message } = req.body;

  // 1. Check if pet exists and is available for adoption
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select('*')
    .eq('id', petId)
    .single();

  if (petError || !pet) {
    return res.status(404).json({ error: 'Pet not found' });
  }

  if (pet.listing_type !== 'adoption') {
    return res.status(400).json({ error: 'This pet is listed for sale, not adoption' });
  }

  if (pet.status !== 'available') {
    return res.status(400).json({ error: `This pet is currently ${pet.status}` });
  }

  // 2. Create the adoption request
  const { data: request, error: reqError } = await supabase
    .from('adoption_requests')
    .insert([{
      requester_id: req.user.id,
      pet_id: petId,
      message,
      status: 'pending'
    }])
    .select()
    .single();

  if (reqError) {
    throw Object.assign(new Error(`Failed to create request: ${reqError.message}`), { status: 500 });
  }

  // 3. Update the pet status to 'pending'
  const { error: updateError } = await supabase
    .from('pets')
    .update({ status: 'pending' })
    .eq('id', petId);

  if (updateError) {
    throw Object.assign(new Error(`Failed to update pet status: ${updateError.message}`), { status: 500 });
  }

  res.status(201).json(request);
});

// @route   GET /api/adoptions/incoming
// @desc    Seller sees requests for their pets
export const getIncomingRequests = asyncHandler(async (req, res) => {
  // Using an inner join to fetch only requests where the related pet belongs to this seller
  const { data, error } = await supabase
    .from('adoption_requests')
    .select('*, pets!inner(*)')
    .eq('pets.seller_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw Object.assign(new Error(`Fetch error: ${error.message}`), { status: 500 });
  res.status(200).json(data);
});

// @route   GET /api/adoptions/mine
// @desc    Requester sees their own requests
export const getMyRequests = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('adoption_requests')
    .select('*, pets(*)')
    .eq('requester_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw Object.assign(new Error(`Fetch error: ${error.message}`), { status: 500 });
  res.status(200).json(data);
});

export const updateAdoptionStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required()
});

// @route   PATCH /api/adoptions/:id
// @desc    Seller or admin approves or rejects the adoption request
export const updateAdoptionStatus = asyncHandler(async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;

  // 1. Fetch the adoption request and the associated pet
  const { data: request, error: fetchError } = await supabase
    .from('adoption_requests')
    .select('*, pets(*)')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    return res.status(404).json({ error: 'Adoption request not found' });
  }

  // 2. Authorization check (only pet owner or admin can update the request)
  if (req.user.role !== 'admin' && request.pets.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: You do not own the associated pet' });
  }

  // 3. Ensure the request is currently pending
  if (request.status !== 'pending') {
    return res.status(400).json({ error: `Cannot update a request that is already ${request.status}` });
  }

  // 4. Handle status change
  if (status === 'approved') {
    // Mark this request as approved
    await supabase.from('adoption_requests').update({ status: 'approved' }).eq('id', requestId);
    // Set pet to adopted
    await supabase.from('pets').update({ status: 'adopted' }).eq('id', request.pet_id);
    // Reject all other pending requests for this same pet
    await supabase
      .from('adoption_requests')
      .update({ status: 'rejected' })
      .eq('pet_id', request.pet_id)
      .eq('status', 'pending');
  } else if (status === 'rejected') {
    // Mark this request as rejected
    await supabase.from('adoption_requests').update({ status: 'rejected' }).eq('id', requestId);
    
    // Check if there are any remaining pending requests for this pet
    const { count } = await supabase
      .from('adoption_requests')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', request.pet_id)
      .eq('status', 'pending');
      
    // If no more pending requests, free up the pet status to 'available'
    if (count === 0) {
      await supabase.from('pets').update({ status: 'available' }).eq('id', request.pet_id);
    }
  }

  // Return the updated request
  const { data: updatedRequest, error: refetchError } = await supabase
    .from('adoption_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (refetchError) throw Object.assign(new Error(refetchError.message), { status: 500 });
  res.status(200).json(updatedRequest);
});
