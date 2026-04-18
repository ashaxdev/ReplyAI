const router = require('express').Router();
const SalesOrder = require('../models/SalesOrder');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ── List orders ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, payment, platform, search, page = 1, limit = 30, from, to } = req.query;
    const filter = { tenantId: req.tenant._id };

    if (status) filter.status = status;
    if (payment) filter.paymentStatus = payment;
    if (platform) filter.platform = platform;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      filter.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      SalesOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      SalesOrder.countDocuments(filter),
    ]);

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Get single order ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const order = await SalesOrder.findOne({ _id: req.params.id, tenantId: req.tenant._id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Create order manually ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { customer, items, paymentMethod, notes, platform = 'manual' } = req.body;
    if (!customer?.name || !items?.length) return res.status(400).json({ error: 'Customer name and items required' });

    const subtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
    const total = subtotal + (req.body.shippingFee || 0) - (req.body.discount || 0);

    const order = await SalesOrder.create({
      tenantId: req.tenant._id,
      platform,
      customer,
      items: items.map(i => ({ ...i, totalPrice: i.unitPrice * i.quantity })),
      subtotal,
      total,
      paymentMethod: paymentMethod || 'pending',
      notes,
      capturedByAi: false,
    });

    res.status(201).json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Update order status ──────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, trackingNumber, courierName, cancelReason } = req.body;
    const update = { status };
    if (trackingNumber) update.trackingNumber = trackingNumber;
    if (courierName) update.courierName = courierName;
    if (cancelReason) update.cancelReason = cancelReason;
    if (status === 'shipped') update.shippedAt = new Date();
    if (status === 'delivered') update.deliveredAt = new Date();
    if (status === 'cancelled') update.cancelledAt = new Date();

    const order = await SalesOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      update, { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Update payment ───────────────────────────────────────────────
router.patch('/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentRef } = req.body;
    const order = await SalesOrder.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { paymentStatus, paymentMethod, paymentRef }, { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Sales analytics ──────────────────────────────────────────────
router.get('/meta/analytics', async (req, res) => {
  try {
    const tid = req.tenant._id;
    const { period = '30d' } = req.query;

    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [overview, daily, byStatus, byPlatform, topProducts, recentOrders] = await Promise.all([
      // Overall totals
      SalesOrder.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          paidRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } },
          pendingRevenue: { $sum: { $cond: [{ $ne: ['$paymentStatus', 'paid'] }, '$total', 0] } },
          aiCaptured: { $sum: { $cond: ['$capturedByAi', 1, 0] } },
        }}
      ]),
      // Daily revenue chart
      SalesOrder.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        }},
        { $sort: { _id: 1 } }
      ]),
      // By status
      SalesOrder.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$total' } } }
      ]),
      // By platform
      SalesOrder.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: { _id: '$platform', count: { $sum: 1 }, revenue: { $sum: '$total' } } }
      ]),
      // Top products
      SalesOrder.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $group: {
          _id: '$items.productName',
          totalQty: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
          orderCount: { $sum: 1 },
        }},
        { $sort: { totalRevenue: -1 } },
        { $limit: 8 }
      ]),
      // Recent orders (5)
      SalesOrder.find({ tenantId: tid }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    res.json({
      overview: overview[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, paidRevenue: 0, pendingRevenue: 0, aiCaptured: 0 },
      daily,
      byStatus,
      byPlatform,
      topProducts,
      recentOrders,
      period,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Export CSV ───────────────────────────────────────────────────
router.get('/meta/export', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { tenantId: req.tenant._id };
    if (from) filter.createdAt = { $gte: new Date(from) };
    if (to) filter.createdAt = { ...filter.createdAt, $lte: new Date(to) };

    const orders = await SalesOrder.find(filter).sort({ createdAt: -1 }).lean();

    const header = ['Order No', 'Date', 'Customer', 'Phone', 'Address', 'Items', 'Total', 'Payment', 'Status', 'Platform', 'AI Captured'];
    const rows = orders.map(o => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('en-IN'),
      o.customer?.name,
      o.customer?.phone || '',
      o.customer?.address?.line1 || '',
      o.items?.map(i => `${i.productName} x${i.quantity}`).join('; '),
      o.total,
      o.paymentMethod,
      o.status,
      o.platform,
      o.capturedByAi ? 'Yes' : 'No',
    ]);

    const csv = [header, ...rows].map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
