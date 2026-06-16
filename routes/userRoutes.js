import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { syncUser, getMe, updateMe, updateProfileSchema } from '../controllers/userController.js';

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// Routes
router.post('/sync', syncUser);
router.get('/me', getMe);
router.patch('/me', validate(updateProfileSchema), updateMe);

export default router;
