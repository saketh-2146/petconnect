import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import route stubs
import authRoutes from './routes/auth.js';
import userRoutes from './routes/userRoutes.js';
import petRoutes from './routes/petRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adoptionRoutes from './routes/adoptionRoutes.js';

// Import error handler
import errorHandler from './middleware/errorHandler.js';
import { handleWebhook } from './controllers/paymentController.js';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL, // Strictly restrict to frontend URL
  credentials: true
}));
app.use(morgan('dev'));

// Razorpay Webhook (must use express.raw to preserve raw body for signature verification)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());

// Rate Limiting (Global)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window`
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter Rate Limiting for Auth/Payment sensitive routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Limit each IP to 30 requests per `window` for sensitive routes
  message: 'Too many requests from this IP to sensitive routes, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/payments', authLimiter, paymentRoutes); // Applying stricter rate limit
app.use('/api/adoptions', adoptionRoutes);

// Global Error Handler Middleware (must be the last middleware)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
