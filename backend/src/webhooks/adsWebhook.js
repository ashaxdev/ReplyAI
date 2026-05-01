const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const Tenant = require('../models/Tenant');
const AdCampaign = require('../models/AdCampaign');
const AdLead = require('../models/AdLead');
const Conversation = require('../models/Conversation');
const { generateAdLeadMessage } = require('../services/adIntelligence');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// Dedup cache — per tenant
const processedLeads = new Map();

function isDuplicate(tenantId, metaLeadId) {
  const key = `${tenantId}:${metaLeadId}`;
  if (processedLeads.has(key)) return true;
  processedLeads.set(key, Date.now());
  // Cleanup old entries every 1000 entries
  if (processedLeads.size > 1000) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, v] of processedLeads) {
      if (v < cutoff) processedLeads.delete(k);
    }
  }
  return false;
}

// ── Verify Meta webhook signature ────────────────────────────────
function verifyMetaSignature(rawBody, signature) {
  if (!signature || !process.env.META_APP_SECRET) return true; // skip if not set
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch { return false; }
}

// ── GET: Webhook verification ─────────────────────────────────────
// Each tenant has their own webhook URL: /webhooks/ads/:tenantId
router.get('/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Ad webhook verify attempt', { tenantId, mode, token: token?.substring(0, 8) + '...' });

  if (mode !== 'subscribe') return res.sendStatus(403);

  try {
    const tenant = await Tenant.findById(tenantId).select('platforms');
    if (!tenant) {
      logger.warn('Tenant not found for webhook verify', { tenantId });
      return res.sendStatus(403);
    }

    // Check Meta Ads connection verify token
    const conn = tenant.platforms?.find(p => p.platform === 'meta_ads');
    if (!conn) {
      logger.warn('Meta Ads not connected for tenant', { tenantId });
      return res.sendStatus(403);
    }

    logger.debug('Token check', {
      stored: conn.webhookVerifyToken,
      received: token,
      match: conn.webhookVerifyToken === token
    });

    if (conn.webhookVerifyToken === token) {
      logger.info('Ad webhook verified', { tenantId });
      return res.status(200).send(challenge);
    }

    logger.warn('Token mismatch', { tenantId });
    res.sendStatus(403);
  } catch (err) {
    logger.error('Webhook verify error:', err);
    res.sendStatus(500);
  }
});

// ── POST: Incoming lead / event ───────────────────────────────────
router.post('/:tenantId', async (req, res) => {
  // Always respond 200 immediately to Meta
  res.sendStatus(200);

  const { tenantId } = req.params;
  const signature = req.headers['x-hub-signature-256'];
  const rawBody = req.body;

  // Verify signature
  if (!verifyMetaSignature(rawBody, signature)) {
    logger.warn('Invalid Meta signature on ad webhook', { tenantId });
    return;
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString());
  } catch {
    logger.error('Invalid JSON on ad webhook', { tenantId });
    return;
  }

  // Route by object type
  if (body.object === 'page' || body.object === 'instagram') {
    const changes = body?.entry?.[0]?.changes || [];
    for (const change of changes) {
      if (change.field === 'leadgen') {
        processLeadGenEntry(tenantId, change.value).catch(err =>
          logger.error('Lead processing error:', { tenantId, error: err.message })
        );
      }
    }
  }
});

// ── Process a leadgen form submission ─────────────────────────────
async function processLeadGenEntry(tenantId, value) {
  const metaLeadId  = value?.leadgen_id;
  const adId        = value?.ad_id;
  const adName      = value?.ad_name;
  const campaignId  = value?.campaign_id;
  const formId      = value?.form_id;

  if (!metaLeadId) return;

  // Dedup check — per tenant, so same lead ID from different tenants is OK
  if (isDuplicate(tenantId, metaLeadId)) {
    logger.debug('Duplicate lead skipped', { tenantId, metaLeadId });
    return;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant?.isActive || !tenant.hasQuota()) {
    logger.warn('Tenant inactive or quota exceeded', { tenantId });
    return;
  }

  // Get tenant's Meta Ads connection
  const adsConn = tenant.platforms?.find(p => p.platform === 'meta_ads' && p.isConnected);
  if (!adsConn) {
    logger.warn('Meta Ads not connected for tenant', { tenantId });
    return;
  }

  const accessToken = decrypt(adsConn.accessTokenEncrypted);

  // Fetch lead data from Meta using TENANT's own token
  let leadData = {};
  try {
    const resp = await axios.get(
      `https://graph.facebook.com/v18.0/${metaLeadId}`,
      { params: { access_token: accessToken }, timeout: 8000 }
    );
    (resp.data?.field_data || []).forEach(f => {
      const key = f.name?.toLowerCase().replace(/[^a-z]/g, '_');
      const val = f.values?.[0];
      if (key.includes('name'))  leadData.name  = val;
      if (key.includes('phone')) leadData.phone = val;
      if (key.includes('email')) leadData.email = val;
      if (key.includes('city'))  leadData.city  = val;
    });
  } catch (err) {
    logger.warn('Could not fetch lead from Meta', { tenantId, metaLeadId, error: err.message });
  }

  // Find matching campaign in THIS tenant's campaigns
  const campaign = await AdCampaign.findOne({
    tenantId,
    $or: [
      { metaCampaignId: campaignId },
      { metaAdId: adId },
    ]
  });

  // Save lead — scoped to this tenant
  let adLead;
  try {
    adLead = await AdLead.create({
      tenantId,
      campaignId: campaign?._id,
      platform: 'instagram',
      adId,
      adName,
      metaLeadId,
      metaFormId: formId,
      name:  leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      city:  leadData.city,
      status: 'new',
    });
  } catch (err) {
    if (err.code === 11000) {
      logger.debug('Lead already exists (unique constraint)', { tenantId, metaLeadId });
      return;
    }
    throw err;
  }

  logger.info('Ad lead saved', {
    tenantId,
    leadId: adLead._id,
    name: leadData.name,
    campaign: campaign?.name
  });

  // Update tenant ad stats
  await Tenant.updateOne(
    { _id: tenantId, 'platforms.platform': 'meta_ads' },
    { $inc: { 'platforms.$.totalLeads': 1 } }
  );

  // Update campaign lead count
  if (campaign) {
    await AdCampaign.findByIdAndUpdate(campaign._id, {
      $inc: { 'metrics.leads': 1 }
    });
  }

  // Auto follow-up via WhatsApp using TENANT's WhatsApp
  if (leadData.phone) {
    await sendLeadFollowUp(tenant, adLead, campaign, accessToken);
  }
}

// ── Send instant WhatsApp follow-up ──────────────────────────────
async function sendLeadFollowUp(tenant, adLead, campaign, adsToken) {
  try {
    const waConn = tenant.platforms?.find(
      p => p.platform === 'whatsapp' && p.isConnected
    );
    if (!waConn) {
      logger.info('No WhatsApp connected for tenant, skipping follow-up', {
        tenantId: tenant._id
      });
      return;
    }

    if (!tenant.hasQuota()) return;

    const waToken = decrypt(waConn.accessTokenEncrypted);

    // Generate personalised first message using AI
    const { generateAdLeadMessage } = require('../services/adIntelligence');
    const msgResult = await generateAdLeadMessage(
      tenant,
      adLead,
      campaign?.name || 'our Instagram ad',
      campaign?.productName || tenant.businessName
    );

    // Find or create conversation
    const phoneNumber = adLead.phone.replace(/\D/g, '');
    const normalised = phoneNumber.startsWith('91')
      ? phoneNumber
      : `91${phoneNumber.slice(-10)}`;

    const conv = await Conversation.findOneAndUpdate(
      { tenantId: tenant._id, platform: 'whatsapp', customerId: normalised },
      {
        $setOnInsert: {
          tenantId: tenant._id,
          platform: 'whatsapp',
          customerId: normalised,
          customerName: adLead.name,
          customerPhone: normalised,
        },
        $set: { lastActivityAt: new Date() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Add message to conversation
    conv.messages.push({
      direction: 'outbound',
      content: msgResult.message,
      aiGenerated: true,
    });
    await conv.save();

    // Send via tenant's own WhatsApp number
    await axios.post(
      `https://graph.facebook.com/v18.0/${waConn.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: normalised,
        type: 'text',
        text: { body: msgResult.message }
      },
      {
        headers: { Authorization: `Bearer ${waToken}` },
        timeout: 10000
      }
    );

    // Update lead
    await AdLead.findByIdAndUpdate(adLead._id, {
      conversationId: conv._id,
      aiContactedAt: new Date(),
      status: 'contacted',
      $inc: { aiMessagesSent: 1 }
    });

    // Decrement quota
    await tenant.updateOne({ $inc: { 'subscription.repliesUsed': 1 } });

    logger.info('Ad lead follow-up sent', {
      tenantId: tenant._id,
      leadId: adLead._id,
      phone: normalised
    });
  } catch (err) {
    logger.error('Follow-up failed', {
      tenantId: tenant._id,
      leadId: adLead._id,
      error: err.message
    });
  }
}

module.exports = router;
