const router = require('express').Router();
const AdCampaign = require('../models/AdCampaign');
const AdLead = require('../models/AdLead');
const Tenant = require('../models/Tenant');
const { authenticate } = require('../middleware/auth');
const {
  generateTargetingBrief,
  generateAdCopy,
  analysePerformance,
  buildLookalikeExport,
  generateAdLeadMessage,
} = require('../services/adIntelligence');
const { syncCampaignMetrics } = require('../services/metaAdsService');
const logger = require('../utils/logger');

router.use(authenticate);

// ════════════════════════════════════════════════════════════
// CAMPAIGNS — every query uses { tenantId: req.tenant._id }
// ════════════════════════════════════════════════════════════

// List all campaigns for this tenant only
router.get('/campaigns', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { tenantId: req.tenant._id }; // ← ISOLATION
    if (status) filter.status = status;

    const [campaigns, total] = await Promise.all([
      AdCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      AdCampaign.countDocuments(filter)
    ]);

    // Attach lead counts for this tenant's campaigns
    const ids = campaigns.map(c => c._id);
    const leadCounts = await AdLead.aggregate([
      { $match: { tenantId: req.tenant._id, campaignId: { $in: ids } } }, // ← ISOLATION
      { $group: {
        _id: '$campaignId',
        total:     { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status','ordered'] }, 1, 0] } },
        contacted: { $sum: { $cond: [{ $ne:  ['$status','new']    }, 1, 0] } },
      }}
    ]);

    const lcMap = Object.fromEntries(leadCounts.map(l => [l._id.toString(), l]));
    const enriched = campaigns.map(c => ({
      ...c,
      leadCount:     lcMap[c._id.toString()]?.total     || 0,
      convertedCount:lcMap[c._id.toString()]?.converted || 0,
      contactedCount:lcMap[c._id.toString()]?.contacted || 0,
    }));

    res.json({ campaigns: enriched, total, page: Number(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single campaign — must belong to this tenant
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id   // ← ISOLATION
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create campaign for this tenant
router.post('/campaigns', async (req, res) => {
  try {
    const campaign = await AdCampaign.create({
      ...req.body,
      tenantId: req.tenant._id   // ← ISOLATION — always overwrite with auth tenant
    });
    res.status(201).json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update — must belong to this tenant
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { tenantId, ...safeBody } = req.body; // prevent tenantId override
    const campaign = await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id }, // ← ISOLATION
      safeBody,
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update status
router.patch('/campaigns/:id/status', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id }, // ← ISOLATION
      { status: req.body.status },
      { new: true }
    );
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete (archive)
router.delete('/campaigns/:id', async (req, res) => {
  try {
    await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id }, // ← ISOLATION
      { status: 'completed' }
    );
    res.json({ archived: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sync metrics from Meta using TENANT's own token
router.post('/campaigns/:id/sync', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id   // ← ISOLATION
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    const tenant = await Tenant.findById(req.tenant._id).select('platforms');
    const result = await syncCampaignMetrics(tenant, campaign);
    res.json({ synced: true, metrics: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// AI TOOLS — all use req.tenant data only
// ════════════════════════════════════════════════════════════

// Generate targeting from THIS tenant's customer data
router.post('/ai/targeting', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id);
    const result = await generateTargetingBrief(tenant); // uses tenant's orders only
    if (!result.success) return res.status(500).json({ error: result.error });

    // Cache the suggestion on the tenant's profile (optional)
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate ad copy
router.post('/ai/copy', async (req, res) => {
  try {
    const { productName, productDescription, productPrice, campaignGoal } = req.body;
    if (!productName || !productPrice)
      return res.status(400).json({ error: 'productName and productPrice required' });
    const tenant = await Tenant.findById(req.tenant._id);
    const result = await generateAdCopy(tenant, productName, productDescription, productPrice, campaignGoal);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Analyse campaign performance with AI
router.post('/ai/analyse/:id', async (req, res) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id   // ← ISOLATION
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    const leads = await AdLead.find({ // ← ISOLATION
      campaignId: campaign._id,
      tenantId: req.tenant._id
    }).lean();

    const tenant = await Tenant.findById(req.tenant._id);
    const result = await analysePerformance(tenant, campaign, leads);
    if (!result.success) return res.status(500).json({ error: result.error });
    res.json(result.data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Build lookalike export from THIS tenant's customers only
router.get('/ai/lookalike-export', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.tenant._id);
    const result = await buildLookalikeExport(tenant); // uses tenant._id to filter orders
    if (!result.success) return res.status(500).json({ error: result.error });

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${tenant.businessName}-lookalike-${Date.now()}.csv"`);
      return res.send(result.csv);
    }

    res.json({
      count: result.count,
      instructions: result.instructions,
      preview: result.csv.split('\n').slice(0, 6).join('\n')
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// LEADS — all scoped to tenantId
// ════════════════════════════════════════════════════════════

router.get('/leads', async (req, res) => {
  try {
    const { campaignId, status, page = 1, limit = 30 } = req.query;
    const filter = { tenantId: req.tenant._id }; // ← ISOLATION
    if (campaignId) filter.campaignId = campaignId;
    if (status) filter.status = status;

    const [leads, total] = await Promise.all([
      AdLead.find(filter)
        .populate('campaignId', 'name productName') // only name fields, not token
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      AdLead.countDocuments(filter)
    ]);

    res.json({ leads, total, page: Number(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/leads/:id/status', async (req, res) => {
  try {
    const lead = await AdLead.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id }, // ← ISOLATION
      {
        status: req.body.status,
        ...(req.body.orderValue && { orderValue: req.body.orderValue })
      },
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Manual re-send follow-up
router.post('/leads/:id/followup', async (req, res) => {
  try {
    const lead = await AdLead.findOne({
      _id: req.params.id,
      tenantId: req.tenant._id   // ← ISOLATION
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    if (!lead.phone) return res.status(400).json({ error: 'No phone number for this lead' });

    const tenant = await Tenant.findById(req.tenant._id);
    const campaign = lead.campaignId
      ? await AdCampaign.findOne({ _id: lead.campaignId, tenantId: req.tenant._id })
      : null;

    const msgResult = await generateAdLeadMessage(
      tenant, lead,
      campaign?.name || 'our ad',
      campaign?.productName || tenant.businessName
    );

    // Update lead
    await AdLead.findByIdAndUpdate(lead._id, {
      $inc: { aiMessagesSent: 1 },
      reEngagedAt: new Date(),
      $inc: { reEngageCount: 1 }
    });

    res.json({ sent: true, message: msgResult.message });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// ANALYTICS — all scoped to tenantId
// ════════════════════════════════════════════════════════════

router.get('/analytics', async (req, res) => {
  try {
    const tid = req.tenant._id; // ← ISOLATION — everything filters by this
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [overview, byStatus, leadFunnel, dailyLeads, topCampaigns] = await Promise.all([

      // Overall metrics — THIS tenant only
      AdCampaign.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: {
          _id: null,
          totalSpend:       { $sum: '$metrics.spend' },
          totalLeads:       { $sum: '$metrics.leads' },
          totalConversions: { $sum: '$metrics.conversions' },
          totalRevenue:     { $sum: '$metrics.revenue' },
          totalImpressions: { $sum: '$metrics.impressions' },
          avgRoas:          { $avg: '$metrics.roas' },
          activeCampaigns:  { $sum: { $cond: [{ $eq: ['$status','active'] }, 1, 0] } },
        }}
      ]),

      // Campaign status breakdown
      AdCampaign.aggregate([
        { $match: { tenantId: tid } },
        { $group: { _id: '$status', count: { $sum: 1 }, spend: { $sum: '$metrics.spend' } } }
      ]),

      // Lead funnel — THIS tenant's leads
      AdLead.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Daily leads
      AdLead.aggregate([
        { $match: { tenantId: tid, createdAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          leads:     { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$status','ordered'] }, 1, 0] } }
        }},
        { $sort: { _id: 1 } }
      ]),

      // Top campaigns by ROAS
      AdCampaign.find({ tenantId: tid, 'metrics.spend': { $gt: 0 } })
        .sort({ 'metrics.roas': -1 })
        .limit(5)
        .select('name metrics.roas metrics.cpl metrics.leads metrics.spend status')
        .lean()
    ]);

    const ov = overview[0] || {};
    const avgCpl = ov.totalLeads > 0 ? ov.totalSpend / ov.totalLeads : 0;
    const convRate = ov.totalLeads > 0
      ? ((ov.totalConversions / ov.totalLeads) * 100).toFixed(1)
      : '0.0';

    res.json({
      overview: { ...ov, avgCpl: Math.round(avgCpl), convRate },
      byStatus,
      leadFunnel,
      dailyLeads,
      topCampaigns,
      period,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
