const mongoose = require('mongoose');

// Flexible variant system — works for clothing (size/color),
// electronics (storage/color), food (portion/spice), etc.
const VariantSchema = new mongoose.Schema({
  name: String,           // e.g., "Size", "Color", "Storage", "Portion"
  options: [String],      // e.g., ["S","M","L"] or ["64GB","128GB"]
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Core fields (all businesses)
  name: { type: String, required: true, trim: true },
  description: String,
  category: { type: String, index: true },
  subCategory: String,
  sku: { type: String, trim: true },
  barcode: String,

  // Pricing
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },    // for profit tracking
  currency: { type: String, default: 'INR' },
  taxPercent: { type: Number, default: 0 },

  // Inventory
  stockQuantity: { type: Number, default: 0, min: 0 },
  lowStockAlert: { type: Number, default: 5 },
  trackInventory: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  unit: { type: String, default: 'piece' }, // piece, kg, litre, metre, etc.

  // Variants (flexible — any business type)
  variants: [VariantSchema],

  // Media
  images: [String],
  thumbnailUrl: String,

  // Extra flexible data — store anything business-specific
  // e.g., { brand, material, weight, expiryDays, cuisine }
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },

  // AI search tags — helps AI find the right product
  tags: [String],

  // Status
  isActive: { type: Boolean, default: true },
  archivedAt: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual: effective price (sale price if set, otherwise regular)
ProductSchema.virtual('effectivePrice').get(function() {
  return this.salePrice || this.price;
});

// Virtual: profit margin %
ProductSchema.virtual('margin').get(function() {
  if (!this.costPrice) return null;
  return (((this.effectivePrice - this.costPrice) / this.effectivePrice) * 100).toFixed(1);
});

// Pre-save: auto-set isAvailable based on stock
ProductSchema.pre('save', function(next) {
  if (this.trackInventory) {
    this.isAvailable = this.stockQuantity > 0;
  }
  next();
});

// Indexes
ProductSchema.index({ tenantId: 1, isActive: 1 });
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ tenantId: 1, name: 'text', description: 'text', tags: 'text' }); // full-text search
ProductSchema.index({ tenantId: 1, sku: 1 }, { sparse: true });
ProductSchema.index({ tenantId: 1, stockQuantity: 1 }); // for low-stock queries

module.exports = mongoose.model('Product', ProductSchema);
