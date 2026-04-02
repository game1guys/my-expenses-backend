import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import partyRoutes from './routes/party.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import profileRoutes from './routes/profile.routes';
import subscriptionRoutes from './routes/subscription.routes';
import cron from 'node-cron';
import { processDailyReminders } from './services/reminder.job';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Admin notification can send base64 image_url — default 100kb limit caused PayloadTooLargeError
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Main App Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Catch-all for 404 debugging
app.use((req, res) => {
  console.log(`[404 DEBUG] Unmatched Request: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    url: req.url,
    hint: 'Check if backend is fully deployed'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Daily-KHATA API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Available routes:`);
  console.log(`- /api/auth`);
  console.log(`- /api/categories`);
  console.log(`- /api/transactions`);
  console.log(`- /api/profile`);
});

// Schedule daily expense reminder at 8:00 PM IST (20:00)
// Note: Render servers usually use UTC. 8 PM IST is 2:30 PM UTC.
// Setting for 20:00 server time.
cron.schedule('0 20 * * *', () => {
  console.log('[Cron] Running daily expense reminders at 8 PM...');
  processDailyReminders();
});
