// ================================================================
// dashboard.js  — Aggregated stats for the dashboard
// ================================================================
const dashRouter = require('express').Router();
const Tenant = require('../models/Tenant');
const Product = require('../models/Product');
const Conversation = require('../models/Conversation');
const { authenticate } = require('../middleware/auth');

dashRouter.use(authenticate);

dashRouter.get('/stats', async (req, res) => {
  try {
    const tid = req.tenant._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [products, conversations, tenant, platformStats, recentConvs] = await Promise.all([
      Product.aggregate([
        { $match: { tenantId: tid, isActive: true } },
        { $group: { _id: null, total: { $sum: 1 }, available: { $sum: { $cond: ['$isAvailable', 1, 0] } }, lowStock: { $sum: { $cond: [{ $and: [{ $lte: ['$stockQuantity', 10] }, { $gt: ['$stockQuantity', 0] }] }, 1, 0] } } } }
      ]),
      Conversation.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: null, total: { $sum: 1 }, open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } }, whatsapp: { $sum: { $cond: [{ $eq: ['$platform', 'whatsapp'] }, 1, 0] } }, instagram: { $sum: { $cond: [{ $eq: ['$platform', 'instagram'] }, 1, 0] } }, ordered: { $sum: { $cond: [{ $eq: ['$leadStatus', 'ordered'] }, 1, 0] } }, handedOff: { $sum: { $cond: ['$isHandedOff', 1, 0] } } } }
      ]),
      Tenant.findById(tid).select('subscription platforms businessName businessType'),
      Conversation.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Conversation.find({ tenantId: tid }).sort({ lastActivityAt: -1 }).limit(8)
        .select('platform customerName customerId status leadStatus lastActivityAt messages').lean()
    ]);

    res.json({
      products: products[0] || { total: 0, available: 0, lowStock: 0 },
      conversations: conversations[0] || { total: 0, open: 0, whatsapp: 0, instagram: 0, ordered: 0 },
      quota: { used: tenant.subscription.repliesUsed, limit: tenant.subscription.replyLimit, plan: tenant.subscription.plan, resetDate: tenant.subscription.resetDate },
      platforms: tenant.platforms.map(p => ({ platform: p.platform, isConnected: p.isConnected, messagesSent: p.messagesSent, lastActivity: p.lastActivity })),
      activityChart: platformStats,
      recentConversations: recentConvs.map(c => ({ ...c, lastMessage: c.messages?.[c.messages.length - 1]?.content?.substring(0, 80), messages: undefined }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = dashRouter;
