const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

// ── Verify Access Token ───────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch fresh tenant data (catches deactivated accounts)
    const tenant = await Tenant.findById(decoded.id).select('-passwordHash -emailVerifyToken -passwordResetToken -twoFactorSecret');
    if (!tenant || !tenant.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    // Check if account is locked
    if (tenant.isLocked) {
      return res.status(423).json({ error: 'Account temporarily locked due to failed login attempts' });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// ── Check plan feature access ─────────────────────────────────────
const requirePlan = (...plans) => (req, res, next) => {
  const { plan } = req.tenant.subscription;
  if (!plans.includes(plan)) {
    return res.status(403).json({
      error: 'Feature not available on your plan',
      requiredPlan: plans[0],
      currentPlan: plan,
      upgradeUrl: '/dashboard/billing'
    });
  }
  next();
};

// ── Check quota before AI reply ───────────────────────────────────
const checkQuota = async (req, res, next) => {
  if (!req.tenant.hasQuota()) {
    return res.status(429).json({
      error: 'Monthly reply quota exceeded',
      used: req.tenant.subscription.repliesUsed,
      limit: req.tenant.subscription.replyLimit,
      resetDate: req.tenant.subscription.resetDate,
    });
  }
  next();
};

// ── Generate token pair ───────────────────────────────────────────
const generateTokens = (tenant) => {
  const payload = {
    id: tenant._id,
    email: tenant.email,
    businessName: tenant.businessName,
    plan: tenant.subscription.plan,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'repliai-erp',
    audience: 'repliai-client',
  });

  const refreshToken = jwt.sign(
    { id: tenant._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

module.exports = { authenticate, requirePlan, checkQuota, generateTokens };
