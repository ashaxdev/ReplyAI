const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  sku: String,
  variant: String,        // e.g. "Size: L, Color: Red"
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
}, { _id: false });

const AddressSchema = new mongoose.Schema({
  line1: String, line2: String,
  city: String, state: String,
  pincode: String, country: { type: String, default: 'India' },
}, { _id: false });

const SalesOrderSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Order identity
  orderNumber: { type: String, unique: true },   // e.g. ORD-2024-00042
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  platform: { type: String, enum: ['whatsapp', 'instagram', 'manual'], required: true },

  // Customer
  customer: {
    name: { type: String, required: true },
    phone: String,
    platformId: String,     // WhatsApp/Instagram user ID
    address: AddressSchema,
  },

  // Items
  items: [OrderItemSchema],

  // Financials
  subtotal:    { type: Number, required: true },
  discount:    { type: Number, default: 0 },
  taxAmount:   { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  total:       { type: Number, required: true },
  currency:    { type: String, default: 'INR' },

  // Payment
  paymentMethod: { type: String, enum: ['cod', 'upi', 'bank_transfer', 'card', 'prepaid', 'pending'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentRef: String,     // UPI ref, transaction ID

  // Fulfillment
  status: {
    type: String,
    enum: ['new', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'new', index: true
  },
  trackingNumber: String,
  courierName: String,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancelReason: String,

  // AI metadata
  capturedByAi: { type: Boolean, default: true },
  aiConfidenceScore: Number,   // 0–1, how confident AI was about order details
  rawAiCapture: String,        // original AI-extracted text for audit

  // Staff
  assignedTo: String,
  notes: String,
  tags: [String],
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Auto-generate order number before save
SalesOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.orderNumber = `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Indexes for analytics queries
SalesOrderSchema.index({ tenantId: 1, createdAt: -1 });
SalesOrderSchema.index({ tenantId: 1, status: 1 });
SalesOrderSchema.index({ tenantId: 1, 'customer.phone': 1 });
SalesOrderSchema.index({ tenantId: 1, paymentStatus: 1 });

module.exports = mongoose.model('SalesOrder', SalesOrderSchema);
