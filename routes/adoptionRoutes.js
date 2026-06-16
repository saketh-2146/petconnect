import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  requestAdoption,
  getIncomingRequests,
  getMyRequests,
  updateAdoptionStatus,
  updateAdoptionStatusSchema,
  requestAdoptionSchema
} from '../controllers/adoptionController.js';

const router = express.Router();

// All adoption routes require authentication
router.use(verifyToken);

// Specific routes
router.get('/incoming', requireRole('seller', 'admin'), getIncomingRequests);
router.get('/mine', getMyRequests);

// Dynamic/Parametrized routes
router.post('/:petId', validate(requestAdoptionSchema), requestAdoption);
router.patch('/:id', requireRole('seller', 'admin'), validate(updateAdoptionStatusSchema), updateAdoptionStatus);

export default router;
