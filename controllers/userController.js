import { supabase } from '../config/supabase.js';
import { auth } from '../config/firebase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import Joi from 'joi';

// Validation schema for patching the profile
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().max(20).optional(),
  role: Joi.string().valid('buyer', 'seller', 'admin').optional(),
});

// @route   POST /api/users/sync
// @desc    Upsert user profile from Firebase token (syncs latest data)
export const syncUser = asyncHandler(async (req, res) => {
  // Decode the token again to get the freshest data from Firebase
  const token = req.headers.authorization.split(' ')[1];
  const decodedToken = await auth.verifyIdToken(token);
  
  const email = decodedToken.email || '';
  const name = decodedToken.name || (email ? email.split('@')[0] : 'Unknown');
  const phone = decodedToken.phone_number || null;

  // Perform an upsert on the users table using the firebase_uid as the conflict target.
  // Since verifyToken might have already created it, this will update the existing user.
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: req.user.id,
        firebase_uid: decodedToken.uid,
        email,
        name,
        phone,
      },
      { onConflict: 'firebase_uid' }
    )
    .select()
    .single();

  if (error) {
    throw Object.assign(new Error(`Failed to sync user: ${error.message}`), { status: 500 });
  }

  res.status(200).json(data);
});

// @route   GET /api/users/me
// @desc    Return the current user's profile
export const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by the verifyToken middleware
  res.status(200).json(req.user);
});

// @route   PATCH /api/users/me
// @desc    Update name, phone, or role
export const updateMe = asyncHandler(async (req, res) => {
  const updates = req.body;
  
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) {
    throw Object.assign(new Error(`Failed to update profile: ${error.message}`), { status: 500 });
  }

  res.status(200).json(data);
});
