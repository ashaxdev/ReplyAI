// ================================================================
// products.js
// ================================================================
const productRouter = require('express').Router();
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');
const { validators, handleValidationErrors } = require('../middleware/security');
productRouter.use(authenticate);

productRouter.get('/', async (req, res) => {
  try {
    const { search, category, available, page = 1, limit = 50, lowStock } = req.query;
    const filter = { tenantId: req.tenant._id, isActive: true };
    if (category) filter.category = category;
    if (available === 'true') filter.isAvailable = true;
    if (available === 'false') filter.isAvailable = false;
    if (lowStock === 'true') filter.stockQuantity = { $lte: 10, $gt: 0 };
    if (search) filter.$text = { $search: search };
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Product.countDocuments(filter)
    ]);
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

productRouter.post('/', validators.product, handleValidationErrors, async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, tenantId: req.tenant._id });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

productRouter.put('/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      req.body, { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

productRouter.patch('/:id/stock', async (req, res) => {
  try {
    const { stockQuantity } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { stockQuantity, isAvailable: stockQuantity > 0 }, { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: product._id, name: product.name, stockQuantity: product.stockQuantity, isAvailable: product.isAvailable });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

productRouter.delete('/:id', async (req, res) => {
  try {
    await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { isActive: false, archivedAt: new Date() }
    );
    res.json({ archived: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bulk stock update (CSV import style)
productRouter.post('/bulk-stock', async (req, res) => {
  try {
    const { updates } = req.body; // [{ sku, stockQuantity }]
    const ops = updates.map(u => ({
      updateOne: {
        filter: { tenantId: req.tenant._id, sku: u.sku },
        update: { stockQuantity: u.stockQuantity, isAvailable: u.stockQuantity > 0 }
      }
    }));
    const result = await Product.bulkWrite(ops);
    res.json({ updated: result.modifiedCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get categories
productRouter.get('/meta/categories', async (req, res) => {
  const cats = await Product.distinct('category', { tenantId: req.tenant._id, isActive: true });
  res.json(cats.filter(Boolean));
});

module.exports = productRouter;
