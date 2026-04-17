const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Tenant = require('../models/Tenant');
const { authenticate } = require('../middleware/auth');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

router.use(authenticate);

// ── Get connections ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  const tenant = await Tenant.findById(req.tenant._id).select('platforms');
  // Never send encrypted token to frontend
  const safe = tenant.platforms.map(({ platform, phoneNumberId, instagramAccountId, isConnected, connectedAt, messagesSent, lastActivity }) =>
    ({ platform, phoneNumberId, instagramAccountId, isConnected, connectedAt, messagesSent, lastActivity })
  );
  res.json(safe);
});

// ── Connect WhatsApp ──────────────────────────────────────────────
router.post('/whatsapp', async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;
    if (!phoneNumberId || !accessToken)
      return res.status(400).json({ error: 'phoneNumberId and accessToken required' });

    const verifyToken = uuidv4();
    const encryptedToken = encrypt(accessToken);

    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { platforms: { platform: 'whatsapp' } }
    });

    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $push: {
        platforms: {
          platform: 'whatsapp',
          phoneNumberId,
          accessTokenEncrypted: encryptedToken,
          webhookVerifyToken: verifyToken,
          isConnected: true,
          connectedAt: new Date()
        }
      }
    });

    const backendUrl = process.env.BACKEND_URL || 'https://your-backend.railway.app';
    const webhookUrl = `${backendUrl}/webhooks/whatsapp/${req.tenant._id}`;

    logger.info('WhatsApp connected', { tenantId: req.tenant._id });

    res.json({
      connected: true,
      webhookUrl,
      verifyToken,
      instructions: [
        `1. Go to Meta Developer App → WhatsApp → Configuration → Webhooks`,
        `2. Click Edit → Paste Webhook URL: ${webhookUrl}`,
        `3. Paste Verify Token: ${verifyToken}`,
        `4. Subscribe to: messages, messaging_postbacks`,
        `5. Click Verify and Save`
      ]
    });
  } catch (err) {
    logger.error('WhatsApp connect error:', err);
    res.status(500).json({ error: 'Failed to connect WhatsApp' });
  }
});

// ── Connect Instagram ─────────────────────────────────────────────
router.post('/instagram', async (req, res) => {
  try {
    const { instagramAccountId, accessToken } = req.body;
    if (!instagramAccountId || !accessToken)
      return res.status(400).json({ error: 'instagramAccountId and accessToken required' });

    const verifyToken = uuidv4();
    const encryptedToken = encrypt(accessToken);

    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { platforms: { platform: 'instagram' } }
    });

    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $push: {
        platforms: {
          platform: 'instagram',
          instagramAccountId,
          accessTokenEncrypted: encryptedToken,
          webhookVerifyToken: verifyToken,
          isConnected: true,
          connectedAt: new Date()
        }
      }
    });

    const backendUrl = process.env.BACKEND_URL || 'https://your-backend.railway.app';
    const webhookUrl = `${backendUrl}/webhooks/instagram/${req.tenant._id}`;

    logger.info('Instagram connected', { tenantId: req.tenant._id });

    res.json({
      connected: true,
      webhookUrl,
      verifyToken,
      instructions: [
        `1. Go to Meta Developer App → Webhooks`,
        `2. Select Instagram → Subscribe`,
        `3. Paste Webhook URL: ${webhookUrl}`,
        `4. Paste Verify Token: ${verifyToken}`,
        `5. Subscribe to: messages, messaging_postbacks`,
        `6. Ensure instagram_manage_messages permission is approved`
      ]
    });
  } catch (err) {
    logger.error('Instagram connect error:', err);
    res.status(500).json({ error: 'Failed to connect Instagram' });
  }
});

// ── Disconnect platform ───────────────────────────────────────────
router.delete('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { platforms: { platform } }
    });
    logger.info('Platform disconnected', { tenantId: req.tenant._id, platform });
    res.json({ disconnected: true });
  } catch (err) {
    res.status(500).json({ error: 'Disconnect failed' });
  }
});

module.exports = router;
