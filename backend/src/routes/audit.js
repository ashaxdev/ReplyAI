const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
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

module.exports = router;
