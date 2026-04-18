const router = require('express').Router();
const AdCampaign = require('../models/AdCampaign');
const AdLead = require('../models/AdLead');
const { authenticate } = require('../middleware/auth');
const {
  generateTargetingBrief,
  generateAdCopy,
  analysePerformance,
  buildLookalikeExport,
} = require('../services/adIntelligence');
const { syncCampaignMetrics } = require('../services/metaAdsService');

router.use(authenticate);

// ══════════════════════════════════════════════════════════════
// CAMPAIGNS
// ══════════════════════════════════════════════════════════════

// List campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { tenantId: req.tenant._id };
    if (status) filter.status = status;

    const [campaigns, total] = await Promise.all([
      AdCampaign.find(filter).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit)).lean(),
      AdCampaign.countDocuments(filter)
    ]);

    // Add lead counts
    const ids = campaigns.map(c => c._id);
    const leadCounts = await AdLead.aggregate([
      { $match: { campaignId: { $in: ids } } },
      { $group: { _id: '$campaignId', total: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'ordered'] }, 1, 0] } } } }
    ]);
    const lcMap = Object.fromEntries(leadCounts.map(l => [l._id.toString(), l]));

    const enriched = campaigns.map(c => ({
      ...c,
      leadCount: lcMap[c._id.toString()]?.total || 0,
      convertedCount: lcMap[c._id.toString()]?.converted || 0,
    }));

    res.json({ campaigns: enriched, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const campaign = await AdCampaign.create({ ...req.body, tenantId: req.tenant._id });
    res.status(201).json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      req.body, { new: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update status (pause/resume/complete)
router.patch('/campaigns/:id/status', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { status: req.body.status }, { new: true }
    );
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete (archive)
router.delete('/campaigns/:id', async (req, res) => {
  try {
    await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { status: 'completed' }
    );
    res.json({ archived: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sync metrics from Meta
router.post('/campaigns/:id/sync', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const tenant = req.tenant;
    const result = await syncCampaignMetrics(tenant, campaign);
    res.json({ synced: true, metrics: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// AI TOOLS
// ══════════════════════════════════════════════════════════════

// Generate targeting brief from customer data
router.post('/ai/targeting', async (req, res) => {
  try {
    const result = await generateTargetingBrief(req.tenant);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate ad copy variants
router.post('/ai/copy', async (req, res) => {
  try {
    const { productName, productDescription, productPrice, campaignGoal } = req.body;
    if (!productName || !productPrice) return res.status(400).json({ error: 'productName and productPrice required' });
    const result = await generateAdCopy(req.tenant, productName, productDescription, productPrice, campaignGoal);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Analyse campaign performance
router.post('/ai/analyse/:id', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({ _id: req.params.id, tenantId: req.tenant._id });
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const leads = await AdLead.find({ campaignId: campaign._id }).lean();
    const result = await analysePerformance(req.tenant, campaign, leads);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Build lookalike audience CSV
router.get('/ai/lookalike-export', async (req, res) => {
  try {
    const result = await buildLookalikeExport(req.tenant);
    if (!result.success) return res.status(500).json({ error: result.error });

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="lookalike-audience.csv"');
      return res.send(result.csv);
    }
    res.json({ count: result.count, instructions: result.instructions, preview: result.csv.split('\n').slice(0, 5).join('\n') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// LEADS
// ══════════════════════════════════════════════════════════════

router.get('/leads', async (req, res) => {
  try {
    const { campaignId, status, page = 1, limit = 30 } = req.query;
    const filter = { tenantId: req.tenant._id };
    if (campaignId) filter.campaignId = campaignId;
    if (status) filter.status = status;

    const [leads, total] = await Promise.all([
      AdLead.find(filter).populate('campaignId', 'name').sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit)).lean(),
      AdLead.countDocuments(filter)
    ]);
    res.json({ leads, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/leads/:id/status', async (req, res) => {
  try {
    const lead = await AdLead.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      { status: req.body.status, ...(req.body.orderValue && { orderValue: req.body.orderValue }) },
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Not found' });
    res.json(lead);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════

router.get('/analytics', async (req, res) => {
  try {
    const tid = req.tenant._id;
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [overview, campaignPerf, leadFunnel, dailyLeads, topCampaigns] = await Promise.all([
      // Overall metrics across all campaigns
      AdCampaign.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: { _id: null,
          totalSpend: { $sum: '$metrics.spend' },
          totalLeads: { $sum: '$metrics.leads' },
          totalConversions: { $sum: '$metrics.conversions' },
          totalRevenue: { $sum: '$metrics.revenue' },
          totalImpressions: { $sum: '$metrics.impressions' },
          avgRoas: { $avg: '$metrics.roas' },
          activeCampaigns: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
        }}
      ]),
      // Per-campaign performance
      AdCampaign.find({ tenantId: tid }).sort({ 'metrics.revenue': -1 }).limit(10)
        .select('name status metrics budget.amount createdAt').lean(),
      // Lead funnel
      AdLead.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Daily leads
      AdLead.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, leads: { $sum: 1 }, converted: { $sum: { $cond: [{ $eq: ['$status', 'ordered'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }
      ]),
      // Top campaigns by ROAS
      AdCampaign.find({ tenantId: tid, 'metrics.spend': { $gt: 0 } })
        .sort({ 'metrics.roas': -1 }).limit(5)
        .select('name metrics.roas metrics.cpl metrics.leads metrics.spend').lean()
    ]);

    const ov = overview[0] || {};
    const avgCpl = ov.totalLeads > 0 ? (ov.totalSpend / ov.totalLeads) : 0;
    const convRate = ov.totalLeads > 0 ? ((ov.totalConversions / ov.totalLeads) * 100).toFixed(1) : 0;

    res.json({
      overview: { ...ov, avgCpl: Math.round(avgCpl), convRate },
      campaignPerf,
      leadFunnel,
      dailyLeads,
      topCampaigns,
      period
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Meta Webhook (Lead Ads) ──────────────────────────────────────
// Verification
router.get('/webhook/:tenantId', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.send(challenge);
  }
  res.sendStatus(403);
});

// Incoming lead
router.post('/webhook/:tenantId', async (req, res) => {
  res.sendStatus(200);
  const { processLeadAdWebhook, verifyMetaSignature } = require('../services/metaAdsService');
  const body = JSON.parse(req.body.toString());
  if (body.object === 'page' || body.object === 'instagram') {
    processLeadAdWebhook(body, req.params.tenantId).catch(console.error);
  }
});

module.exports = router;
