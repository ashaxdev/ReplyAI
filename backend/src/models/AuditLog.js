const mongoose = require('mongoose');

// Every sensitive action is logged here — immutable audit trail
const AuditLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  actor: {
    type: { type: String, enum: ['tenant', 'team_member', 'system', 'webhook'] },
    id: String,
    email: String,
    ip: String,
    userAgent: String,
  },
  action: {
    type: String,
    required: true,
    // Auth events
    // LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_RESET, 2FA_ENABLED
    // Data events
    // PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED
    // PLATFORM_CONNECTED, PLATFORM_DISCONNECTED
    // TEAM_MEMBER_INVITED, TEAM_MEMBER_REMOVED
    // AI_SETTINGS_UPDATED, SUBSCRIPTION_CHANGED
    // WEBHOOK_RECEIVED, AI_REPLY_SENT
  },
  resource: { type: String },         // e.g. "Product", "Platform"
  resourceId: String,
  changes: mongoose.Schema.Types.Mixed, // { before: {}, after: {} }
  metadata: mongoose.Schema.Types.Mixed,
  success: { type: Boolean, default: true },
  errorMessage: String,
}, {
  timestamps: true,
  // TTL: auto-delete logs older than 90 days
  // (remove the index below to keep forever)
});

AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ 'actor.email': 1 });
AuditLogSchema.index({ action: 1 });
// TTL index: auto-expire after 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
