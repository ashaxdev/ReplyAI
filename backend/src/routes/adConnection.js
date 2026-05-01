const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Tenant = require('../models/Tenant');
const { authenticate } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

router.use(authenticate);

// ── Get tenant's Meta Ads connection status ───────────────────────
router.get('/status', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id).select('platforms');
    const adsConn = tenant.platforms?.find(p => p.platform === 'meta_ads');

    if (!adsConn) {
      return res.json({ connected: false });
    }

    // Never send encrypted token to frontend
    res.json({
      connected: adsConn.isConnected,
      adAccountId: adsConn.adAccountId,
      pageId: adsConn.pageId,
      instagramActorId: adsConn.instagramActorId,
      pixelId: adsConn.pixelId,
      connectedAt: adsConn.connectedAt,
      lastActivity: adsConn.lastActivity,
      totalAdSpend: adsConn.totalAdSpend,
      totalLeads: adsConn.totalLeads,
      totalConversions: adsConn.totalConversions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Connect tenant's Meta Ads account ────────────────────────────
// Each tenant provides their OWN Meta credentials
router.post('/connect', async (req, res) => {
  try {
    const {
      adAccountId,       // "act_XXXXXXXX"
      pageId,            // Facebook Page ID
      instagramActorId,  // IG Business Account ID
      accessToken,       // Page Access Token (long-lived)
      pixelId,           // optional
      metaAppId,         // optional — if they use their own app
    } = req.body;

    if (!adAccountId || !accessToken) {
      return res.status(400).json({
        error: 'adAccountId and accessToken are required'
      });
    }

    // Encrypt the access token before storing
    const encryptedToken = encrypt(accessToken);
    const verifyToken = uuidv4(); // unique webhook verify token per tenant

    // Remove old meta_ads connection if exists
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { platforms: { platform: 'meta_ads' } }
    });

    // Add new connection
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $push: {
        platforms: {
          platform: 'meta_ads',
          adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
          pageId,
          instagramActorId,
          accessTokenEncrypted: encryptedToken,
          webhookVerifyToken: verifyToken,
          pixelId,
          metaAppId,
          isConnected: true,
          connectedAt: new Date(),
        }
      }
    });

    const backendUrl = process.env.BACKEND_URL || 'https://your-backend.onrender.com';
    const webhookUrl = `${backendUrl}/webhooks/ads/${req.tenant._id}`;

    logger.info('Meta Ads connected for tenant', {
      tenantId: req.tenant._id,
      adAccountId
    });

    res.json({
      connected: true,
      webhookUrl,
      verifyToken,
      adAccountId,
      instructions: [
        `1. Go to Meta Developer App → Webhooks → Page`,
        `2. Add callback URL: ${webhookUrl}`,
        `3. Verify token: ${verifyToken}`,
        `4. Subscribe to field: leadgen`,
        `5. Also subscribe to: messages (for DM automation)`,
      ]
    });
  } catch (err) {
    logger.error('Meta Ads connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Disconnect Meta Ads ────────────────────────────────────────────
router.delete('/disconnect', async (req, res) => {
  try {
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { platforms: { platform: 'meta_ads' } }
    });
    logger.info('Meta Ads disconnected', { tenantId: req.tenant._id });
    res.json({ disconnected: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Validate tenant's access token with Meta ──────────────────────
router.post('/validate-token', async (req, res) => {
  try {
    const axios = require('axios');
    const tenant = await Tenant.findById(req.tenant._id).select('platforms');
    const conn = tenant.platforms?.find(p => p.platform === 'meta_ads');
    if (!conn) return res.status(404).json({ error: 'Meta Ads not connected' });

    const token = decrypt(conn.accessTokenEncrypted);

    // Check token validity with Meta
    const result = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: { access_token: token, fields: 'id,name' },
      timeout: 8000
    });

    res.json({
      valid: true,
      metaUserId: result.data.id,
      metaUserName: result.data.name,
    });
  } catch (err) {
    res.json({
      valid: false,
      error: 'Token invalid or expired. Please reconnect.'
    });
  }
});

module.exports = router;
