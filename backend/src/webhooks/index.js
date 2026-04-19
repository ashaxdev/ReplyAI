const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const Tenant = require('../models/Tenant');
const Conversation = require('../models/Conversation');
const { generateReply } = require('../services/aiService');
const { decrypt } = require('../utils/encryption');
const { webhookLimiter } = require('../middleware/security');
const logger = require('../utils/logger');

// Message deduplication cache (in-memory, 5 min TTL)
const processedMessages = new Map();
const DEDUP_TTL = 5 * 60 * 1000;

function isDuplicate(messageId) {
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, Date.now());
  // Cleanup old entries
  if (processedMessages.size > 1000) {
    const cutoff = Date.now() - DEDUP_TTL;
    for (const [k, v] of processedMessages) {
      if (v < cutoff) processedMessages.delete(k);
    }
  }
  return false;
}

// ── Meta Signature Verification ───────────────────────────────────
function verifyMetaSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ── Send WhatsApp Message ─────────────────────────────────────────
async function sendWhatsApp(phoneNumberId, accessToken, to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
  );
}

// ── Send Instagram DM ─────────────────────────────────────────────
async function sendInstagram(accessToken, recipientId, text) {
  await axios.post(
    'https://graph.facebook.com/v18.0/me/messages',
    { recipient: { id: recipientId }, message: { text } },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
  );
}

// ── Core message handler (shared logic) ──────────────────────────
async function handleMessage(tenantId, platform, customerId, customerName, incomingText, messageId) {
  if (isDuplicate(messageId)) {
    logger.debug('Duplicate message skipped', { messageId });
    return;
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant?.isActive) return;
  if (!tenant.hasQuota()) {
    logger.warn('Quota exceeded', { tenantId });
    return;
  }

  // Check platform is connected
  const platformConn = tenant.platforms.find(p => p.platform === platform && p.isConnected);
  if (!platformConn) return;

  // Find or create conversation (upsert)
  let conversation = await Conversation.findOneAndUpdate(
    { tenantId, platform, customerId },
    {
      $setOnInsert: { tenantId, platform, customerId, customerName, customerPhone: platform === 'whatsapp' ? customerId : undefined },
      $set: { lastActivityAt: new Date() }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // If conversation was just created, update name if available
  if (!conversation.customerName && customerName) {
    conversation.customerName = customerName;
  }

  // Add inbound message
  conversation.messages.push({
    direction: 'inbound',
    content: incomingText,
    platformMessageId: messageId,
  });

  await conversation.save();

  // Check if handed off to human — skip AI
  if (conversation.isHandedOff) {
    logger.info('Conversation handed off, skipping AI', { conversationId: conversation._id });
    return;
  }

  // Check human handoff keywords
  const handoffKeywords = tenant.aiSettings.humanHandoffKeywords || [];
  const needsHandoff = handoffKeywords.some(kw => incomingText.toLowerCase().includes(kw.toLowerCase()));
  if (needsHandoff) {
    conversation.isHandedOff = true;
    conversation.handedOffAt = new Date();
    conversation.status = 'pending';
    await conversation.save();
  }

  // Get recent message history for context
  const history = conversation.messages.slice(-20, -1); // exclude the just-added inbound msg

  // Generate AI reply
  const aiResult = await generateReply(tenant, incomingText, history);

  // Save outbound message
  conversation.messages.push({
    direction: 'outbound',
    content: aiResult.text,
    aiGenerated: true,
    aiModel: aiResult.model,
    tokensUsed: aiResult.tokensUsed,
  });
  await conversation.save();

  // Decrypt token and send
  const accessToken = decrypt(platformConn.accessTokenEncrypted);

  if (platform === 'whatsapp') {
    await sendWhatsApp(platformConn.phoneNumberId, accessToken, customerId, aiResult.text);
  } else {
    await sendInstagram(accessToken, customerId, aiResult.text);
  }

  // Update platform stats
  await Tenant.updateOne(
    { _id: tenantId, 'platforms.platform': platform },
    { $inc: { 'platforms.$.messagesSent': 1 }, $set: { 'platforms.$.lastActivity': new Date() } }
  );

  logger.info('AI reply sent', { tenantId, platform, customerId, tokens: aiResult.tokensUsed });
}

// ── WhatsApp Webhook Verification ────────────────────────────────
router.get('/whatsapp/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe') {
    const tenant = await Tenant.findById(tenantId);
    const conn = tenant?.platforms.find(p => p.platform === 'whatsapp');
    if (conn?.webhookVerifyToken === token) return res.send(challenge);
  }
  res.sendStatus(403);
});

// ── WhatsApp Incoming ─────────────────────────────────────────────
router.post('/whatsapp/:tenantId', webhookLimiter, async (req, res) => {
  res.sendStatus(200); // Always 200 immediately

  if (!verifyMetaSignature(req)) {
    logger.warn('Invalid Meta signature on WhatsApp webhook');
    return;
  }

  const body = JSON.parse(req.body.toString());
  if (body.object !== 'whatsapp_business_account') return;

  const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages;
  const contacts = body?.entry?.[0]?.changes?.[0]?.value?.contacts;
  if (!messages?.length) return;

  const msg = messages[0];
  if (msg.type !== 'text') return;

  const customerName = contacts?.[0]?.profile?.name || msg.from;

  handleMessage(req.params.tenantId, 'whatsapp', msg.from, customerName, msg.text.body, msg.id)
    .catch(err => logger.error('WhatsApp handler error:', err));
});

// ── Instagram Webhook Verification ───────────────────────────────
// router.get('/instagram/:tenantId', async (req, res) => {
//   const { tenantId } = req.params;
//   const mode = req.query['hub.mode'];
//   const token = req.query['hub.verify_token'];
//   const challenge = req.query['hub.challenge'];

//   const tenant = await Tenant.findById(tenantId);
//   console.log('Tenant found:', !!tenant);
//   console.log('Platforms:', JSON.stringify(tenant?.platforms?.map(p => ({ platform: p.platform, isConnected: p.isConnected, token: p.webhookVerifyToken }))));
//   console.log('Token received:', token);

//   if (mode === 'subscribe') {
//     const tenant = await Tenant.findById(tenantId);
//     const conn = tenant?.platforms.find(p => p.platform === 'instagram');
//     if (conn?.webhookVerifyToken === token) return res.send(challenge);
//   }
//   res.sendStatus(403);
// });

router.get('/instagram/:tenantId', async (req, res) => {
  const { tenantId } = req.params;

  const mode = req.query['hub.mode'] || req.query['hub_mode'];
  const token = req.query['hub.verify_token'] || req.query['hub_verify_token'];
  const challenge = req.query['hub.challenge'] || req.query['hub_challenge'];

  console.log("Query:", req.query);
  console.log("Mode:", mode);
  console.log("Token:", token);
  console.log("Challenge:", challenge);

  const tenant = await Tenant.findById(tenantId);
  const conn = tenant?.platforms.find(p => p.platform === 'instagram');

  if (mode === 'subscribe' && conn?.webhookVerifyToken === token) {
    console.log("Webhook verified ✅");
    return res.status(200).send(challenge);
  }

  console.log("Webhook failed ❌");
  return res.sendStatus(403);
});
// ── Instagram Incoming ────────────────────────────────────────────
router.post('/instagram/:tenantId', webhookLimiter, async (req, res) => {
  res.sendStatus(200);

  if (!verifyMetaSignature(req)) {
    logger.warn('Invalid Meta signature on Instagram webhook');
    return;
  }

  const body = JSON.parse(req.body.toString());
  if (body.object !== 'instagram') return;

  const messaging = body?.entry?.[0]?.messaging?.[0];
  if (!messaging || messaging.message?.is_echo) return;

  const customerId = messaging.sender?.id;
  const text = messaging.message?.text;
  const messageId = messaging.message?.mid;
  if (!text || !customerId) return;

  handleMessage(req.params.tenantId, 'instagram', customerId, null, text, messageId)
    .catch(err => logger.error('Instagram handler error:', err));
});

module.exports = router;
