const mongoose = require('mongoose');

// ── Ad Creative ───────────────────────────────────────────────────
const AdCreativeSchema = new mongoose.Schema({
  headline:      { type: String, required: true },
  primaryText:   { type: String, required: true },
  description:   String,
  callToAction:  { type: String, enum: ['LEARN_MORE','SHOP_NOW','CONTACT_US','SIGN_UP','GET_QUOTE','BOOK_NOW'], default: 'SHOP_NOW' },
  imageUrl:      String,
  videoUrl:      String,
  hashtags:      [String],
  // Meta IDs after upload
  metaCreativeId: String,
  metaAdId:       String,
}, { _id: false });

// ── Audience Targeting ────────────────────────────────────────────
const AudienceSchema = new mongoose.Schema({
  name:        String,
  ageMin:      { type: Number, default: 18 },
  ageMax:      { type: Number, default: 65 },
  genders:     [{ type: String, enum: ['male', 'female', 'all'] }],
  locations:   [String],          // city/state names
  interests:   [String],          // Meta interest keywords
  languages:   [String],
  audienceType: { type: String, enum: ['manual', 'lookalike', 'custom', 'advantage_plus'], default: 'manual' },
  // Lookalike source
  lookalikeSourceId: String,      // Meta custom audience ID
  lookalikePercent:  Number,      // 1–10%
  // Meta IDs
  metaAudienceId: String,
  estimatedReach: Number,
}, { _id: false });

// ── Budget ────────────────────────────────────────────────────────
const BudgetSchema = new mongoose.Schema({
  type:       { type: String, enum: ['daily', 'lifetime'], default: 'daily' },
  amount:     { type: Number, required: true },   // in INR
  currency:   { type: String, default: 'INR' },
  startDate:  Date,
  endDate:    Date,
}, { _id: false });

// ── Performance Metrics ───────────────────────────────────────────
const MetricsSchema = new mongoose.Schema({
  impressions:    { type: Number, default: 0 },
  reach:          { type: Number, default: 0 },
  clicks:         { type: Number, default: 0 },
  leads:          { type: Number, default: 0 },
  conversions:    { type: Number, default: 0 },   // actual orders placed
  spend:          { type: Number, default: 0 },   // INR spent
  revenue:        { type: Number, default: 0 },   // revenue from this campaign
  ctr:            { type: Number, default: 0 },   // click-through rate %
  cpl:            { type: Number, default: 0 },   // cost per lead
  cpo:            { type: Number, default: 0 },   // cost per order
  roas:           { type: Number, default: 0 },   // return on ad spend
  lastSyncedAt:   Date,
}, { _id: false });

// ── Main Campaign Schema ──────────────────────────────────────────
const AdCampaignSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Identity
  name:       { type: String, required: true },
  objective:  { type: String, enum: ['LEAD_GENERATION', 'TRAFFIC', 'CONVERSIONS', 'BRAND_AWARENESS', 'REACH'], default: 'LEAD_GENERATION' },
  platform:   { type: String, enum: ['instagram', 'facebook', 'both'], default: 'instagram' },

  // Status
  status:     { type: String, enum: ['draft', 'pending_review', 'active', 'paused', 'completed', 'rejected'], default: 'draft' },
  metaCampaignId:  String,
  metaAdSetId:     String,
  metaAdAccountId: String,

  // Content
  creative:  AdCreativeSchema,
  audience:  AudienceSchema,
  budget:    BudgetSchema,

  // AI-generated suggestions
  aiTargetingSuggestion: {
    generatedAt: Date,
    summary:     String,
    topLocations: [String],
    topInterests: [String],
    ageRange:    String,
    reasoning:   String,
  },

  aiCopySuggestions: [{
    variant:    String,   // 'A', 'B', 'C'
    headline:   String,
    primaryText: String,
    description: String,
    score:      Number,   // AI confidence 0-100
  }],

  // Lookalike export
  lookalikeExportedAt: Date,
  lookalikeCustomerCount: Number,

  // Performance
  metrics: MetricsSchema,

  // Lead form (Meta Instant Form)
  leadFormId:    String,      // Meta lead form ID
  leadFormFields: [String],   // fields collected: name, phone, email

  // Notes
  notes: String,
  tags:  [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual: is running
AdCampaignSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual: conversion rate
AdCampaignSchema.virtual('conversionRate').get(function() {
  if (!this.metrics.leads) return 0;
  return ((this.metrics.conversions / this.metrics.leads) * 100).toFixed(1);
});

AdCampaignSchema.index({ tenantId: 1, status: 1 });
AdCampaignSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('AdCampaign', AdCampaignSchema);
