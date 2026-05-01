const mongoose = require('mongoose');

const AdLeadSchema = new mongoose.Schema({
  // ── TENANT ISOLATION ──────────────────────────────────────────
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCampaign',
    index: true
  },

  // ── Source ────────────────────────────────────────────────────
  platform:    { type: String, enum: ['instagram','facebook'], default: 'instagram' },
  adId:        String,
  adName:      String,
  adSetName:   String,
  metaLeadId:  String,   // unique Meta leadgen submission ID
  metaFormId:  String,

  // ── Lead data (from Meta instant form) ───────────────────────
  name:   String,
  phone:  String,
  email:  String,
  city:   String,
  customFields: { type: Map, of: String },

  // ── Journey tracking ──────────────────────────────────────────
  status: {
    type: String,
    enum: ['new','contacted','qualified','ordered','lost'],
    default: 'new',
    index: true
  },

  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  orderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  orderValue:     Number,

  // ── AI follow-up tracking ─────────────────────────────────────
  aiContactedAt:  Date,
  aiMessagesSent: { type: Number, default: 0 },
  firstReplyAt:   Date,   // when lead first replied back
  convertedAt:    Date,

  // ── Re-engagement tracking ────────────────────────────────────
  reEngagedAt:    Date,
  reEngageCount:  { type: Number, default: 0 },

  // ── Attribution ───────────────────────────────────────────────
  adSpendAtCapture: Number,

}, { timestamps: true });

// Unique per tenant (not global) — same Meta lead ID can't be for two tenants
AdLeadSchema.index({ tenantId: 1, metaLeadId: 1 }, { unique: true, sparse: true });
AdLeadSchema.index({ tenantId: 1, campaignId: 1, status: 1 });
AdLeadSchema.index({ tenantId: 1, createdAt: -1 });
AdLeadSchema.index({ tenantId: 1, phone: 1 });

module.exports = mongoose.model('AdLead', AdLeadSchema);
