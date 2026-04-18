const axios = require('axios');
const crypto = require('crypto');
const Tenant = require('../models/Tenant');
const AdCampaign = require('../models/AdCampaign');
const AdLead = require('../models/AdLead');
const Conversation = require('../models/Conversation');
const { generateAdLeadMessage } = require('./adIntelligence');
const { decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// ── Verify Meta webhook signature ────────────────────────────────
function verifyMetaSignature(body, signature) {
  if (!signature) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(body)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

// ── Process incoming Lead Ad submission ──────────────────────────
async function processLeadAdWebhook(body, tenantId) {
  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    if (changes?.field !== 'leadgen') return;

    const leadgenId = changes?.value?.leadgen_id;
    const formId = changes?.value?.form_id;
    const adId = changes?.value?.ad_id;
    const adName = changes?.value?.ad_name;
    const campaignId = changes?.value?.campaign_id;

    if (!leadgenId) return;

    // Avoid duplicate processing
    const existing = await AdLead.findOne({ metaLeadId: leadgenId });
    if (existing) { logger.debug('Duplicate lead webhook, skipping', { leadgenId }); return; }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant?.isActive) return;

    // Get access token
    const platformConn = tenant.platforms?.find(p =>
      (p.platform === 'instagram' || p.platform === 'facebook') && p.isConnected
    );
    if (!platformConn) return;

    const accessToken = decrypt(platformConn.accessTokenEncrypted);

    // Fetch lead data from Meta Graph API
    let leadData = {};
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${leadgenId}`,
        {
          params: { access_token: accessToken },
          timeout: 8000
        }
      );
      const fieldData = response.data?.field_data || [];
      fieldData.forEach(f => {
        const key = f.name?.toLowerCase();
        const val = f.values?.[0];
        if (key === 'full_name' || key === 'name') leadData.name = val;
        if (key === 'phone_number' || key === 'phone') leadData.phone = val;
        if (key === 'email') leadData.email = val;
        if (key === 'city') leadData.city = val;
      });
    } catch (err) {
      logger.warn('Could not fetch lead data from Meta:', err.message);
    }

    // Find matching campaign
    const campaign = await AdCampaign.findOne({
      tenantId,
      $or: [{ metaCampaignId: campaignId }, { metaAdSetId: changes?.value?.adset_id }]
    });

    // Save lead
    const adLead = await AdLead.create({
      tenantId,
      campaignId: campaign?._id,
      platform: 'instagram',
      adId,
      adName,
      metaLeadId: leadgenId,
      metaFormId: formId,
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      city: leadData.city,
      status: 'new',
    });

    logger.info('Ad lead received', { tenantId, leadId: adLead._id, name: leadData.name });

    // Update campaign lead count
    if (campaign) {
      await AdCampaign.findByIdAndUpdate(campaign._id, {
        $inc: { 'metrics.leads': 1 }
      });
    }

    // Auto follow-up on WhatsApp if phone available
    if (leadData.phone && tenant.hasQuota()) {
      await sendLeadFollowUp(tenant, adLead, campaign, platformConn, accessToken);
    }

  } catch (err) {
    logger.error('Lead webhook processing error:', err);
  }
}

// ── Send instant WhatsApp follow-up to new lead ──────────────────
async function sendLeadFollowUp(tenant, adLead, campaign, platformConn, accessToken) {
  try {
    const waConn = tenant.platforms?.find(p => p.platform === 'whatsapp' && p.isConnected);
    if (!waConn) return;

    const waToken = decrypt(waConn.accessTokenEncrypted);

    // Generate personalised first message
    const msgResult = await generateAdLeadMessage(
      tenant,
      adLead,
      campaign?.name || 'our Instagram ad',
      campaign?.name || tenant.businessName
    );

    const message = msgResult.message;

    // Find or create conversation
    let conv = await Conversation.findOneAndUpdate(
      { tenantId: tenant._id, platform: 'whatsapp', customerId: adLead.phone },
      {
        $setOnInsert: {
          tenantId: tenant._id,
          platform: 'whatsapp',
          customerId: adLead.phone,
          customerName: adLead.name,
          customerPhone: adLead.phone,
        },
        $set: { lastActivityAt: new Date() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Add outbound message
    conv.messages.push({ direction: 'outbound', content: message, aiGenerated: true });
    await conv.save();

    // Send via WhatsApp — use template message format for first outbound
    // Meta requires approved template for business-initiated messages
    // We use a generic "text" type here but in production you need an approved template
    await axios.post(
      `https://graph.facebook.com/v18.0/${waConn.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: adLead.phone.replace(/\D/g, '').replace(/^0/, '91'),
        type: 'text',
        text: { body: message }
      },
      { headers: { Authorization: `Bearer ${waToken}` }, timeout: 10000 }
    );

    // Update lead record
    await AdLead.findByIdAndUpdate(adLead._id, {
      conversationId: conv._id,
      aiContactedAt: new Date(),
      $inc: { aiMessagesSent: 1 },
      status: 'contacted'
    });

    // Increment quota
    await tenant.updateOne({ $inc: { 'subscription.repliesUsed': 1 } });

    logger.info('Ad lead follow-up sent', { leadId: adLead._id, phone: adLead.phone });
  } catch (err) {
    logger.error('Lead follow-up failed:', err.message);
  }
}

// ── Sync campaign metrics from Meta API ─────────────────────────
async function syncCampaignMetrics(tenant, campaign) {
  try {
    const platformConn = tenant.platforms?.find(p =>
      (p.platform === 'instagram' || p.platform === 'facebook') && p.isConnected
    );
    if (!platformConn || !campaign.metaCampaignId) return;

    const accessToken = decrypt(platformConn.accessTokenEncrypted);

    const since = campaign.budget?.startDate
      ? new Date(campaign.budget.startDate).toISOString().split('T')[0]
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${campaign.metaCampaignId}/insights`,
      {
        params: {
          fields: 'impressions,reach,clicks,spend,actions,ctr,cpc',
          time_range: JSON.stringify({ since, until: new Date().toISOString().split('T')[0] }),
          access_token: accessToken
        },
        timeout: 10000
      }
    );

    const data = response.data?.data?.[0];
    if (!data) return;

    // Extract lead actions
    const actions = data.actions || [];
    const leadAction = actions.find(a => a.action_type === 'lead') || {};
    const leads = parseInt(leadAction.value) || 0;

    // Get actual orders from our DB attributed to this campaign
    const adLeads = await AdLead.find({ campaignId: campaign._id, status: 'ordered' });
    const revenue = adLeads.reduce((s, l) => s + (l.orderValue || 0), 0);
    const conversions = adLeads.length;

    const spend = parseFloat(data.spend) || 0;
    const ctr = parseFloat(data.ctr) || 0;
    const clicks = parseInt(data.clicks) || 0;
    const impressions = parseInt(data.impressions) || 0;
    const reach = parseInt(data.reach) || 0;
    const cpl = leads > 0 ? spend / leads : 0;
    const cpo = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    await AdCampaign.findByIdAndUpdate(campaign._id, {
      'metrics.impressions': impressions,
      'metrics.reach': reach,
      'metrics.clicks': clicks,
      'metrics.leads': leads,
      'metrics.conversions': conversions,
      'metrics.spend': spend,
      'metrics.revenue': revenue,
      'metrics.ctr': ctr,
      'metrics.cpl': Math.round(cpl * 100) / 100,
      'metrics.cpo': Math.round(cpo * 100) / 100,
      'metrics.roas': Math.round(roas * 100) / 100,
      'metrics.lastSyncedAt': new Date(),
    });

    logger.info('Campaign metrics synced', { campaignId: campaign._id, spend, leads, conversions });
    return { impressions, reach, clicks, leads, conversions, spend, revenue, roas };
  } catch (err) {
    logger.error('Metrics sync error:', { campaignId: campaign._id, error: err.message });
  }
}

module.exports = { processLeadAdWebhook, syncCampaignMetrics, verifyMetaSignature };
