const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PlatformConnectionSchema = new mongoose.Schema({
  platform: { type: String, enum: ['whatsapp', 'instagram'], required: true },
  phoneNumberId: String,           // WhatsApp
  instagramAccountId: String,      // Instagram
  accessTokenEncrypted: String,    // AES-256-GCM encrypted
  webhookVerifyToken: String,
  isConnected: { type: Boolean, default: false },
  connectedAt: Date,
  lastActivity: Date,
  messagesSent: { type: Number, default: 0 }
}, { _id: false });

const SubscriptionSchema = new mongoose.Schema({
  plan: { type: String, enum: ['free', 'starter', 'growth', 'pro', 'enterprise'], default: 'free' },
  status: { type: String, enum: ['active', 'cancelled', 'past_due', 'trialing'], default: 'trialing' },
  trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  razorpayCustomerId: String,
  razorpaySubscriptionId: String,
  replyLimit: { type: Number, default: 100 },   // free tier: 100 replies/month
  repliesUsed: { type: Number, default: 0 },
  resetDate: { type: Date, default: () => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d;
  }}
}, { _id: false });

const AISettingsSchema = new mongoose.Schema({
  greeting: { type: String, default: 'Hello! Welcome 👋 How can I help you today?' },
  policies: String,
  outOfStockMsg: { type: String, default: 'Sorry, this item is currently out of stock. Can I help you with something similar?' },
  humanHandoffKeywords: { type: [String], default: ['agent', 'human', 'person', 'talk to someone'] },
  orderCaptureEnabled: { type: Boolean, default: true },
  language: { type: String, enum: ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'mr', 'bn', 'auto'], default: 'auto' },
  tone: { type: String, enum: ['friendly', 'formal', 'casual', 'professional'], default: 'friendly' },
  customInstructions: String,
}, { _id: false });

const TenantSchema = new mongoose.Schema({
  // Owner info
  ownerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, trim: true },
  emailVerified: { type: Boolean, default: false },
  emailVerifyToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  lastLoginAt: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,

  // Business info — universal for ANY business type
  businessName: { type: String, required: true, trim: true },
  businessType: {
    type: String,
    enum: ['retail', 'restaurant', 'salon', 'electronics', 'grocery', 'pharmacy',
           'real_estate', 'education', 'services', 'manufacturing', 'wholesale', 'other'],
    default: 'retail'
  },
  businessDescription: String,
  businessAddress: {
    line1: String, line2: String, city: String,
    state: String, pincode: String, country: { type: String, default: 'IN' }
  },
  timezone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  logo: String,

  // Team members
  teamMembers: [{
    name: String,
    email: { type: String, lowercase: true },
    role: { type: String, enum: ['admin', 'manager', 'support', 'viewer'], default: 'support' },
    inviteToken: String,
    acceptedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],

  // Platform connections
  platforms: [PlatformConnectionSchema],

  // Subscription
  subscription: { type: SubscriptionSchema, default: () => ({}) },

  // AI settings
  aiSettings: { type: AISettingsSchema, default: () => ({}) },

  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  suspendedAt: Date,
  suspendReason: String,

  // Metadata
  onboardingCompleted: { type: Boolean, default: false },
  referredBy: String,
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.emailVerifyToken;
    delete ret.passwordResetToken;
    delete ret.twoFactorSecret;
    delete ret.__v;
    // Remove encrypted tokens from platform connections
    if (ret.platforms) {
      ret.platforms = ret.platforms.map(p => {
        const { accessTokenEncrypted, webhookVerifyToken, ...safe } = p;
        return safe;
      });
    }
    return ret;
  }}
});

// Virtual: is account locked?
TenantSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Password hashing
TenantSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Password compare
TenantSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Increment login attempts (lockout after 5 failed)
TenantSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hour lock
  }
  return this.updateOne(updates);
};

// Check reply quota
TenantSchema.methods.hasQuota = function() {
  const s = this.subscription;
  if (s.plan === 'pro' || s.plan === 'enterprise') return true;
  return s.repliesUsed < s.replyLimit;
};

// Indexes
TenantSchema.index({ email: 1 });
TenantSchema.index({ 'platforms.phoneNumberId': 1 });
TenantSchema.index({ 'platforms.instagramAccountId': 1 });
TenantSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Tenant', TenantSchema);
