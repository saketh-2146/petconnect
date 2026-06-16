import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPet,
  getPets,
  getMyPets,
  getPetById,
  updatePet,
  deletePet,
  createPetSchema,
  updatePetSchema
} from '../controllers/petController.js';

const router = express.Router();

// Public routes
router.get('/', getPets);

// Protected routes without URL parameters (MUST go before /:id to avoid matching /mine as an ID)
router.get('/mine', verifyToken, requireRole('seller'), getMyPets);

// Public route with parameter
router.get('/:id', getPetById);

// Protected generic routes
router.post('/', verifyToken, requireRole('seller', 'admin'), validate(createPetSchema), createPet);
router.patch('/:id', verifyToken, validate(updatePetSchema), updatePet);
router.delete('/:id', verifyToken, deletePet);

export default router;
