import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables (in case this is imported before server.js loads them)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Key is missing. Please check your environment variables.');
}

// Initialize the Supabase client using the service role key (server-side only)
export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');
