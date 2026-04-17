// ================================================================
// settings.js
// ================================================================
const settingsRouter = require('express').Router();
const Tenant = require('../models/Tenant');
const { authenticate } = require('../middleware/auth');

settingsRouter.use(authenticate);

settingsRouter.get('/', async (req, res) => {
  const t = await Tenant.findById(req.tenant._id).select('businessName businessType businessDescription businessAddress currency timezone aiSettings');
  res.json(t);
});

settingsRouter.put('/business', async (req, res) => {
  try {
    const allowed = ['businessName', 'businessType', 'businessDescription', 'businessAddress', 'currency', 'timezone'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const t = await Tenant.findByIdAndUpdate(req.tenant._id, update, { new: true })
      .select('businessName businessType businessDescription businessAddress currency timezone');
    res.json(t);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

settingsRouter.put('/ai', async (req, res) => {
  try {
    const allowed = ['greeting', 'policies', 'outOfStockMsg', 'humanHandoffKeywords', 'orderCaptureEnabled', 'language', 'tone', 'customInstructions'];
    const aiUpdate = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) aiUpdate[`aiSettings.${k}`] = req.body[k]; });
    const t = await Tenant.findByIdAndUpdate(req.tenant._id, aiUpdate, { new: true }).select('aiSettings');
    res.json(t.aiSettings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

settingsRouter.put('/profile', async (req, res) => {
  try {
    const { ownerName, phone } = req.body;
    const t = await Tenant.findByIdAndUpdate(req.tenant._id, { ownerName, phone }, { new: true })
      .select('ownerName email phone');
    res.json(t);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = settingsRouter;

// ================================================================
// team.js
// ================================================================
const teamRouter = require('express').Router();
const crypto = require('crypto');

teamRouter.use(authenticate);

teamRouter.get('/', async (req, res) => {
  const t = await Tenant.findById(req.tenant._id).select('teamMembers');
  res.json(t.teamMembers || []);
});

teamRouter.post('/invite', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $push: { teamMembers: { name, email, role: role || 'support', inviteToken } }
    });
    // TODO: send invite email
    res.json({ message: `Invite sent to ${email}`, inviteToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

teamRouter.delete('/:memberId', async (req, res) => {
  try {
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { teamMembers: { _id: req.params.memberId } }
    });
    res.json({ removed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.teamRouter = teamRouter;

// ================================================================
// audit.js
// ================================================================
const auditRouter = require('express').Router();
const AuditLog = require('../models/AuditLog');

auditRouter.use(authenticate);

auditRouter.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const filter = { tenantId: req.tenant._id };
    if (action) filter.action = action;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      AuditLog.countDocuments(filter)
    ]);
    res.json({ logs, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports.auditRouter = auditRouter;
