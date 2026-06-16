import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

// Load environment variables (in case this is imported before server.js loads them)
dotenv.config();

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Ensure literal '\n' characters in the environment variable are converted to actual newlines
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined,
};

// Initialize the Firebase admin app (check if already initialized to prevent duplicate app errors)
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Export the initialized admin auth instance for verifying ID tokens
export const auth = getAuth();
