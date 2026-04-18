const mongoose = require('mongoose');

const AdLeadSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCampaign', index: true },

  // Source
  platform:       { type: String, enum: ['instagram', 'facebook'], default: 'instagram' },
  adId:           String,   // Meta ad ID that generated this lead
  adName:         String,   // human-readable ad name
  metaLeadId:     String,   // Meta's lead gen form submission ID
  metaFormId:     String,

  // Lead data (from Meta instant form)
  name:     String,
  phone:    String,
  email:    String,
  city:     String,
  customFields: { type: Map, of: String },

  // Journey
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'ordered', 'lost'],
    default: 'new',
    index: true
  },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  orderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
  orderValue:     Number,

  // AI follow-up
  aiContactedAt:   Date,
  aiMessagesSent:  { type: Number, default: 0 },
  firstReplyAt:    Date,    // when lead first replied back
  convertedAt:     Date,    // when they placed an order

  // Attribution
  adSpendAtConversion: Number,  // how much was spent on this ad when they converted

}, { timestamps: true });

AdLeadSchema.index({ tenantId: 1, campaignId: 1, status: 1 });
AdLeadSchema.index({ tenantId: 1, createdAt: -1 });
AdLeadSchema.index({ metaLeadId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('AdLead', AdLeadSchema);
