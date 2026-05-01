const mongoose = require('mongoose');

const MetricsSchema = new mongoose.Schema({
  impressions:  { type: Number, default: 0 },
  reach:        { type: Number, default: 0 },
  clicks:       { type: Number, default: 0 },
  leads:        { type: Number, default: 0 },
  conversions:  { type: Number, default: 0 },
  spend:        { type: Number, default: 0 },
  revenue:      { type: Number, default: 0 },
  ctr:          { type: Number, default: 0 },
  cpl:          { type: Number, default: 0 },
  cpo:          { type: Number, default: 0 },
  roas:         { type: Number, default: 0 },
  lastSyncedAt: Date,
}, { _id: false });

const AudienceSchema = new mongoose.Schema({
  name:          String,
  ageMin:        { type: Number, default: 18 },
  ageMax:        { type: Number, default: 65 },
  genders:       [String],
  locations:     [String],
  interests:     [String],
  languages:     [String],
  audienceType:  {
    type: String,
    enum: ['manual', 'lookalike', 'custom', 'advantage_plus'],
    default: 'manual'
  },
  // Specific user targeting
  customAudienceId:   String,   // Meta Custom Audience ID (from phone upload)
  lookalikeSourceId:  String,   // Meta Custom Audience to base lookalike on
  lookalikePercent:   Number,   // 1-10%
  metaAudienceId:     String,
  estimatedReach:     Number,
}, { _id: false });

const CreativeSchema = new mongoose.Schema({
  headline:      String,
  primaryText:   String,
  description:   String,
  callToAction:  {
    type: String,
    enum: ['LEARN_MORE','SHOP_NOW','CONTACT_US','SIGN_UP','GET_QUOTE','BOOK_NOW','SEND_MESSAGE'],
    default: 'SHOP_NOW'
  },
  imageUrl:      String,
  hashtags:      [String],
  metaCreativeId: String,
  metaAdId:       String,
}, { _id: false });

const AdCampaignSchema = new mongoose.Schema({
  // ── TENANT ISOLATION (mandatory on every query) ───────────────
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // ── Campaign identity ─────────────────────────────────────────
  name:       { type: String, required: true },
  objective:  {
    type: String,
    enum: ['LEAD_GENERATION','TRAFFIC','CONVERSIONS','BRAND_AWARENESS','REACH'],
    default: 'LEAD_GENERATION'
  },
  platform:   { type: String, enum: ['instagram','facebook','both'], default: 'instagram' },
  productName: String,
  productDescription: String,
  productPrice: Number,

  // ── Status ────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['draft','pending_review','active','paused','completed','rejected'],
    default: 'draft'
  },

  // ── Meta IDs (per tenant, using their ad account) ─────────────
  metaCampaignId:  String,   // ID in tenant's ad account
  metaAdSetId:     String,
  metaAdAccountId: String,   // tenant's ad account: "act_XXXXXXXX"
  metaLeadFormId:  String,

  // ── Campaign content ──────────────────────────────────────────
  creative:  CreativeSchema,
  audience:  AudienceSchema,
  budget: {
    type:      { type: String, enum: ['daily','lifetime'], default: 'daily' },
    amount:    Number,
    currency:  { type: String, default: 'INR' },
    startDate: Date,
    endDate:   Date,
  },

  // ── AI-generated data ─────────────────────────────────────────
  aiTargetingSuggestion: {
    generatedAt:  Date,
    summary:      String,
    topLocations: [String],
    topInterests: [String],
    ageRange:     String,
    reasoning:    String,
    budgetTip:    String,
  },

  aiCopySuggestions: [{
    variant:     String,
    angle:       String,
    headline:    String,
    primaryText: String,
    description: String,
    hashtags:    [String],
    score:       Number,
    whyItWorks:  String,
  }],

  // ── Lookalike export tracking ─────────────────────────────────
  lookalikeExportedAt:     Date,
  lookalikeCustomerCount:  Number,

  // ── Performance ───────────────────────────────────────────────
  metrics: { type: MetricsSchema, default: () => ({}) },

  notes: String,
  tags:  [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual: conversion rate
AdCampaignSchema.virtual('conversionRate').get(function() {
  if (!this.metrics?.leads) return '0.0';
  return ((this.metrics.conversions / this.metrics.leads) * 100).toFixed(1);
});

// ── Indexes — ALL include tenantId for isolation ──────────────────
AdCampaignSchema.index({ tenantId: 1, status: 1 });
AdCampaignSchema.index({ tenantId: 1, createdAt: -1 });
AdCampaignSchema.index({ tenantId: 1, metaCampaignId: 1 });

module.exports = mongoose.model('AdCampaign', AdCampaignSchema);
