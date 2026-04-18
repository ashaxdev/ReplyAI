const cron = require('node-cron');
const Conversation = require('../models/Conversation');
const Tenant = require('../models/Tenant');
const { generateReEngagement } = require('../services/aiService');
const { decrypt } = require('../utils/encryption');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Send WhatsApp re-engagement message
 */
async function sendWhatsApp(phoneNumberId, accessToken, to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
  );
}

/**
 * Re-engage leads who showed interest but didn't order
 * Runs every day at 10am IST
 */
function startReEngagementJob() {
  cron.schedule('0 4 * * *', async () => { // 4 UTC = 9:30 IST
    logger.info('Running re-engagement job...');

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000);

    try {
      // Find conversations where:
      // - Lead status is 'interested' or 'qualified' (not yet ordered)
      // - Last activity was 24-72 hours ago (interested but gone silent)
      // - Not already handed off to human
      const staleConvs = await Conversation.find({
        leadStatus: { $in: ['interested', 'qualified'] },
        lastActivityAt: { $gte: cutoff72h, $lte: cutoff24h },
        isHandedOff: false,
        platform: 'whatsapp', // Only WhatsApp supports outbound for now
      }).populate('tenantId').lean();

      logger.info(`Re-engagement: found ${staleConvs.length} stale conversations`);

      for (const conv of staleConvs) {
        try {
          const tenant = await Tenant.findById(conv.tenantId);
          if (!tenant?.isActive || !tenant.hasQuota()) continue;

          const waConn = tenant.platforms?.find(p => p.platform === 'whatsapp' && p.isConnected);
          if (!waConn) continue;

          // Get product interests from conversation
          const productName = conv.productInterests?.[0] || null;
          const message = await generateReEngagement(tenant, conv.customerName, productName);

          const accessToken = decrypt(waConn.accessTokenEncrypted);
          await sendWhatsApp(waConn.phoneNumberId, accessToken, conv.customerId, message);

          // Save re-engagement message to conversation
          await Conversation.findByIdAndUpdate(conv._id, {
            $push: {
              messages: {
                direction: 'outbound',
                content: message,
                aiGenerated: true,
              }
            },
            lastActivityAt: new Date(),
          });

          // Increment quota
          await tenant.updateOne({ $inc: { 'subscription.repliesUsed': 1 } });

          logger.info('Re-engagement sent', { tenantId: conv.tenantId, customerId: conv.customerId });

          // Rate limit: 1 message per second
          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          logger.error('Re-engagement failed for conversation:', { convId: conv._id, error: err.message });
        }
      }
    } catch (err) {
      logger.error('Re-engagement job error:', err);
    }
  });

  logger.info('Re-engagement cron job scheduled (daily at 10am IST)');
}

/**
 * Monthly quota reset — runs 1st of every month at midnight
 */
function startQuotaResetJob() {
  cron.schedule('0 0 1 * *', async () => {
    const Tenant = require('../models/Tenant');
    const result = await Tenant.updateMany(
      { 'subscription.resetDate': { $lte: new Date() } },
      {
        $set: {
          'subscription.repliesUsed': 0,
          'subscription.resetDate': new Date(new Date().setMonth(new Date().getMonth() + 1))
        }
      }
    );
    logger.info(`Monthly quota reset: ${result.modifiedCount} tenants`);
  });
}

module.exports = { startReEngagementJob, startQuotaResetJob };
