const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// ── Security Headers (Helmet) ─────────────────────────────────────
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// ── Rate Limiters ─────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,    // Meta can send many webhooks per minute
  message: { error: 'Webhook rate limit exceeded' },
});

// ── Input Sanitization ────────────────────────────────────────────
// Prevents MongoDB injection ($where, $gt, etc.)
const sanitizeInputs = mongoSanitize({ replaceWith: '_' });

// Strips XSS from request bodies
const xssProtection = xssClean();

// Prevents HTTP Parameter Pollution
const paramPollutionProtect = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'platform', 'status']
});

// ── Validation Error Handler ──────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// ── Common Validators ─────────────────────────────────────────────
const validators = {
  signup: [
    body('ownerName').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[0-9])/)
      .withMessage('Password must be 8+ chars with uppercase and number'),
    body('businessName').trim().isLength({ min: 2, max: 200 }).withMessage('Business name required'),
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  product: [
    body('name').trim().isLength({ min: 1, max: 500 }).withMessage('Product name required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  ],
};

// ── Audit Logger ──────────────────────────────────────────────────
const auditLog = (action, getResourceInfo) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    // Log after response
    const success = res.statusCode < 400;
    const resourceInfo = getResourceInfo ? getResourceInfo(req, data) : {};

    AuditLog.create({
      tenantId: req.tenant?.id,
      actor: {
        type: req.tenant ? 'tenant' : 'system',
        id: req.tenant?.id,
        email: req.tenant?.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
      action,
      ...resourceInfo,
      success,
      errorMessage: !success ? data?.error : undefined,
    }).catch(err => logger.error('Audit log failed:', err));

    return originalJson(data);
  };
  next();
};

// ── Request Logger ────────────────────────────────────────────────
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      ip: req.ip,
      tenantId: req.tenant?.id,
    });
  });
  next();
};

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  webhookLimiter,
  sanitizeInputs,
  xssProtection,
  paramPollutionProtect,
  handleValidationErrors,
  validators,
  auditLog,
  requestLogger,
};
