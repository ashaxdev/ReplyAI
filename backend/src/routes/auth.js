const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const { generateTokens, authenticate } = require('../middleware/auth');
const { authLimiter, validators, handleValidationErrors, auditLog } = require('../middleware/security');
const logger = require('../utils/logger');

// ── Sign Up ───────────────────────────────────────────────────────
router.post('/signup',
  authLimiter,
  validators.signup,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { ownerName, email, password, businessName, businessType, language, phone } = req.body;

      const exists = await Tenant.findOne({ email });
      if (exists) return res.status(409).json({ error: 'Email already registered' });

      const tenant = await Tenant.create({
        ownerName,
        email,
        passwordHash: password,   // will be hashed by pre-save hook
        businessName,
        businessType: businessType || 'retail',
        phone,
        aiSettings: { language: language || 'auto' },
        emailVerifyToken: crypto.randomBytes(32).toString('hex'),
      });

      const { accessToken, refreshToken } = generateTokens(tenant);

      logger.info('New tenant signup', { tenantId: tenant._id, email, businessType });

      res.status(201).json({
        accessToken,
        refreshToken,
        tenant: tenant.toJSON(),
        message: 'Account created successfully'
      });
    } catch (err) {
      logger.error('Signup error:', err);
      res.status(500).json({ error: 'Server error during signup' });
    }
  }
);

// ── Login ─────────────────────────────────────────────────────────
router.post('/login',
  authLimiter,
  validators.login,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const tenant = await Tenant.findOne({ email }).select('+passwordHash +loginAttempts +lockUntil');
      if (!tenant) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if locked
      if (tenant.isLocked) {
        return res.status(423).json({
          error: 'Account locked due to too many failed attempts. Try again later.',
          lockUntil: tenant.lockUntil
        });
      }

      // Check if active
      if (!tenant.isActive) {
        return res.status(403).json({ error: 'Account is deactivated. Contact support.' });
      }

      const valid = await tenant.comparePassword(password);
      if (!valid) {
        await tenant.incLoginAttempts();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Reset login attempts on success
      await tenant.updateOne({
        $set: { loginAttempts: 0, lastLoginAt: new Date() },
        $unset: { lockUntil: 1 }
      });

      const { accessToken, refreshToken } = generateTokens(tenant);

      logger.info('Tenant login', { tenantId: tenant._id, email });

      res.json({
        accessToken,
        refreshToken,
        tenant: tenant.toJSON()
      });
    } catch (err) {
      logger.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// ── Refresh Token ─────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const tenant = await Tenant.findById(decoded.id);
    if (!tenant?.isActive) return res.status(401).json({ error: 'Invalid refresh token' });

    const tokens = generateTokens(tenant);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── Get current user ──────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  res.json(req.tenant.toJSON());
});

// ── Forgot Password ───────────────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const tenant = await Tenant.findOne({ email });

    // Always respond 200 (don't reveal if email exists)
    if (!tenant) return res.json({ message: 'If that email exists, a reset link was sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await tenant.updateOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    // await sendEmail({ to: email, subject: 'Password Reset', ... })

    logger.info('Password reset requested', { email });
    res.json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Reset Password ────────────────────────────────────────────────
router.post('/reset-password/:token', authLimiter, async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const tenant = await Tenant.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!tenant) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    await tenant.updateOne({
      passwordHash: await require('bcryptjs').hash(password, 12),
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
      loginAttempts: 0,
      $unset: { lockUntil: 1 }
    });

    logger.info('Password reset completed', { tenantId: tenant._id });
    res.json({ message: 'Password reset successfully. Please login.' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
