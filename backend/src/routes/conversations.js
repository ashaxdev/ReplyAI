const router = require('express').Router();
const Conversation = require('../models/Conversation');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const { platform, status, leadStatus, page = 1, limit = 30 } = req.query;
    const filter = { tenantId: req.tenant._id };
    if (platform) filter.platform = platform;
    if (status) filter.status = status;
    if (leadStatus) filter.leadStatus = leadStatus;

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .select('platform customerId customerName customerPhone status leadStatus lastActivityAt isHandedOff productInterests orderValue messages')
        .sort({ lastActivityAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Conversation.countDocuments(filter)
    ]);

    // Add last message preview to each
    const withPreview = conversations.map(c => ({
      ...c,
      lastMessage: c.messages?.[c.messages.length - 1]?.content?.substring(0, 100) || '',
      messageCount: c.messages?.length || 0,
      messages: undefined // don't send full messages in list
    }));

    res.json({ conversations: withPreview, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get single conversation with full messages
router.get('/:id', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, tenantId: req.tenant._id });
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update status / notes
router.patch('/:id', async (req, res) => {
  try {
    const allowed = ['status', 'leadStatus', 'notes', 'tags', 'assignedTo', 'orderValue', 'isHandedOff'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const conv = await Conversation.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenant._id },
      update, { new: true }
    );
    if (!conv) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats summary
router.get('/meta/stats', async (req, res) => {
  try {
    const tid = req.tenant._id;
    const [byStatus, byPlatform, byLead] = await Promise.all([
      Conversation.aggregate([{ $match: { tenantId: tid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Conversation.aggregate([{ $match: { tenantId: tid } }, { $group: { _id: '$platform', count: { $sum: 1 } } }]),
      Conversation.aggregate([{ $match: { tenantId: tid } }, { $group: { _id: '$leadStatus', count: { $sum: 1 } } }]),
    ]);
    res.json({ byStatus, byPlatform, byLead });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
