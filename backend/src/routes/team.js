// team.js
const router = require('express').Router();
const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  const t = await Tenant.findById(req.tenant._id).select('teamMembers');
  res.json(t.teamMembers || []);
});

router.post('/invite', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $push: { teamMembers: { name, email, role: role || 'support', inviteToken } }
    });
    res.json({ message: `Invite sent to ${email}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:memberId', async (req, res) => {
  try {
    await Tenant.findByIdAndUpdate(req.tenant._id, {
      $pull: { teamMembers: { _id: req.params.memberId } }
    });
    res.json({ removed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
