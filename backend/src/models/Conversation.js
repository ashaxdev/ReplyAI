const mongoose = require('mongoose');

// ── Message (embedded in Conversation) ───────────────────────────
const MessageSchema = new mongoose.Schema({
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  content: { type: String, required: true },
  contentType: { type: String, enum: ['text', 'image', 'audio', 'document', 'template'], default: 'text' },
  mediaUrl: String,
  aiGenerated: { type: Boolean, default: false },
  aiModel: String,                    // which Claude model was used
  tokensUsed: Number,
  platformMessageId: String,          // Meta's message ID
  deliveryStatus: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
  failureReason: String,
  sentiment: String,                  // 'positive', 'negative', 'neutral' (future feature)
  isHandedOff: { type: Boolean, default: false }, // true if human took over
}, {
  timestamps: true
});

// ── Conversation ──────────────────────────────────────────────────
const ConversationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Platform info
  platform: { type: String, enum: ['whatsapp', 'instagram'], required: true },
  customerId: { type: String, required: true }, // platform's user ID
  customerPhone: String,
  customerName: String,
  customerProfilePic: String,

  // Messages (embedded for fast reads)
  messages: [MessageSchema],

  // Status
  status: { type: String, enum: ['open', 'pending', 'resolved', 'spam'], default: 'open' },
  isHandedOff: { type: Boolean, default: false }, // AI handed off to human
  handedOffAt: Date,
  assignedTo: String,                 // team member email

  // Lead/Order tracking
  leadStatus: {
    type: String,
    enum: ['new', 'interested', 'qualified', 'ordered', 'completed', 'lost'],
    default: 'new'
  },
  orderValue: Number,
  productInterests: [String],         // products AI detected interest in

  // Context for AI (keeps last N messages)
  lastActivityAt: { type: Date, default: Date.now, index: true },

  // Tags
  tags: [String],
  notes: String,                      // internal notes by team
}, {
  timestamps: true
});

// Compound index for webhook deduplication
ConversationSchema.index({ tenantId: 1, platform: 1, customerId: 1 }, { unique: true });
ConversationSchema.index({ tenantId: 1, status: 1, lastActivityAt: -1 });
ConversationSchema.index({ tenantId: 1, leadStatus: 1 });

// Virtual: message count
ConversationSchema.virtual('messageCount').get(function() {
  return this.messages.length;
});

// Virtual: last message
ConversationSchema.virtual('lastMessage').get(function() {
  return this.messages[this.messages.length - 1];
});

module.exports = mongoose.model('Conversation', ConversationSchema);
