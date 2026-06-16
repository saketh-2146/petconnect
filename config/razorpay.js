import Razorpay from 'razorpay';
import dotenv from 'dotenv';

// Load environment variables (in case this is imported before server.js loads them)
dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.warn('Razorpay Key ID or Key Secret is missing. Please check your environment variables.');
}

// Initialize the Razorpay instance
const razorpay = new Razorpay({
  key_id: key_id || '',
  key_secret: key_secret || '',
});

export default razorpay;
