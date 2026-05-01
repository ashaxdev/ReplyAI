// ADD THIS TO your existing Tenant.js model
// Replace the existing PlatformConnectionSchema with this expanded version

const mongoose = require('mongoose');

// ── Expanded Platform Connection (adds Meta Ads support) ──────────
const PlatformConnectionSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['whatsapp', 'instagram', 'facebook', 'meta_ads'],
    required: true
  },

  // ── WhatsApp ──────────────────────────────────────────────────
  phoneNumberId: String,

  // ── Instagram DMs ─────────────────────────────────────────────
  instagramAccountId: String,

  // ── Meta Ads (NEW) ────────────────────────────────────────────
  adAccountId: String,       // e.g. "act_123456789" — tenant's ad account
  pageId: String,            // Facebook Page ID linked to their IG
  instagramActorId: String,  // IG business account ID for ad delivery
  metaAppId: String,         // if tenant uses their own Meta App
  pixelId: String,           // Meta Pixel for conversion tracking (optional)

  // ── Shared ────────────────────────────────────────────────────
  accessTokenEncrypted: String,   // AES-256-GCM encrypted access token
  webhookVerifyToken: String,     // unique UUID per tenant per platform
  isConnected: { type: Boolean, default: false },
  connectedAt: Date,
  lastActivity: Date,
  messagesSent: { type: Number, default: 0 },

  // ── Meta Ads Stats (cached here for quick dashboard reads) ────
  totalAdSpend: { type: Number, default: 0 },
  totalLeads: { type: Number, default: 0 },
  totalConversions: { type: Number, default: 0 },
  lastSyncedAt: Date,
}, { _id: false });

module.exports = PlatformConnectionSchema;
