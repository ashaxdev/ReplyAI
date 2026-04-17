require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const {
  securityHeaders, generalLimiter, sanitizeInputs,
  xssProtection, paramPollutionProtect, requestLogger
} = require('./middleware/security');

// ── Routes ────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const conversationRoutes = require('./routes/conversations');
const platformRoutes = require('./routes/platforms');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');
const teamRoutes = require('./routes/team');
const auditRoutes = require('./routes/audit');
const webhookRoutes = require('./webhooks');

// ── App Init ──────────────────────────────────────────────────────
const app = express();

// Connect to MongoDB
connectDB();

// Ensure logs directory exists
fs.mkdirSync(path.join(__dirname, '../logs'), { recursive: true });

// ── Security Middleware (order matters!) ──────────────────────────
app.set('trust proxy', 1);            // trust Railway/Vercel proxy
app.use(securityHeaders);             // Helmet HTTP headers
app.disable('x-powered-by');          // Hide Express fingerprint

// CORS — only allow your frontend
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Raw body for Meta webhook signature verification (MUST come before json())
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Parse JSON (with size limit)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security sanitizers
app.use(sanitizeInputs);     // Prevent MongoDB injection
app.use(xssProtection);      // Strip XSS
app.use(paramPollutionProtect); // Prevent HTTP param pollution
app.use(compression());      // Gzip responses

// Request logging
app.use(requestLogger);
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// General rate limiter
app.use('/api', generalLimiter);

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/audit', auditRoutes);
app.use('/webhooks', webhookRoutes);

// ── Health Check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ReplyAI ERP Backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// ── 404 Handler ───────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    tenantId: req.tenant?.id
  });

  // Don't leak internal errors in production
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

// ── Monthly quota reset cron ──────────────────────────────────────
const cron = require('node-cron');
const Tenant = require('./models/Tenant');

cron.schedule('0 0 1 * *', async () => {
  // First day of every month — reset reply counts
  const result = await Tenant.updateMany(
    { 'subscription.resetDate': { $lte: new Date() } },
    {
      $set: {
        'subscription.repliesUsed': 0,
        'subscription.resetDate': new Date(new Date().setMonth(new Date().getMonth() + 1))
      }
    }
  );
  logger.info(`Monthly quota reset: ${result.modifiedCount} tenants reset`);
});

// ── Start Server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 ReplyAI ERP backend running`, { port: PORT, env: process.env.NODE_ENV });
});

module.exports = app;
