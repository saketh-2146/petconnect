import { auth } from '../config/firebase.js';
import { supabase } from '../config/supabase.js';

/**
 * Middleware to verify Firebase ID Token and attach the corresponding Supabase user to req.user.
 * If the user doesn't exist in Supabase, it auto-provisions a new row.
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // 1. Verify token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    const firebase_uid = decodedToken.uid;
    
    // 2. Look up the matching user in Supabase
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebase_uid)
      .single();
      
    // PGRST116 means zero rows returned (not an actual error for our logic)
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase user lookup error:', error);
      return res.status(500).json({ error: 'Internal server error during user lookup' });
    }

    // 3. Auto-provision user if not found
    if (!user) {
      // Extract details from Firebase token (or provide fallbacks)
      const email = decodedToken.email || '';
      const name = decodedToken.name || (email ? email.split('@')[0] : 'Unknown User');
      const phone = decodedToken.phone_number || null;
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          firebase_uid,
          email,
          name,
          phone,
          role: 'buyer' // sensible default
        }])
        .select()
        .single();
        
      if (createError) {
        console.error('Error auto-provisioning user:', createError);
        return res.status(500).json({ error: 'Failed to provision user profile' });
      }
      user = newUser;
    }

    // 4. Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * Middleware to restrict route access to specific user roles.
 * Must be used AFTER verifyToken.
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated properly' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};
