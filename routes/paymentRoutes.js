import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrder, verifyPayment, createOrderSchema, verifyPaymentSchema } from '../controllers/paymentController.js';

const router = express.Router();

// All payment routes must be authenticated
router.use(verifyToken);

router.post('/order', validate(createOrderSchema), createOrder);
router.post('/verify', validate(verifyPaymentSchema), verifyPayment);

export default router;
