const Anthropic = require('@anthropic-ai/sdk');
const SalesOrder = require('../models/SalesOrder');
const Conversation = require('../models/Conversation');
const AdLead = require('../models/AdLead');
const logger = require('../utils/logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── 1. ANALYSE CUSTOMER DATA → GENERATE TARGETING BRIEF ──────────
async function generateTargetingBrief(tenant) {
  try {
    // Pull converted customers from orders
    const orders = await SalesOrder.find({
      tenantId: tenant._id,
      status: { $in: ['delivered', 'shipped', 'confirmed'] }
    }).select('customer items total createdAt').limit(500).lean();

    // Pull lead data
    const leads = await AdLead.find({
      tenantId: tenant._id,
      status: { $in: ['ordered', 'qualified'] }
    }).select('name city platform adName createdAt').limit(200).lean();

    // Pull conversation patterns
    const convStats = await Conversation.aggregate([
      { $match: { tenantId: tenant._id, leadStatus: 'ordered' } },
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);

    // Build data summary for Claude
    const orderSummary = orders.length > 0 ? {
      totalOrders: orders.length,
      avgOrderValue: Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length),
      topProducts: (() => {
        const counts = {};
        orders.forEach(o => o.items?.forEach(i => { counts[i.productName] = (counts[i.productName] || 0) + i.quantity; }));
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => `${name} (${qty} sold)`);
      })(),
      cities: (() => {
        const counts = {};
        orders.forEach(o => {
          const city = o.customer?.address?.city || o.customer?.address?.line1?.split(',').pop()?.trim();
          if (city) counts[city] = (counts[city] || 0) + 1;
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c}: ${n} orders`);
      })(),
    } : null;

    const prompt = `You are an expert digital marketing strategist specialising in Meta (Instagram/Facebook) ads for Indian businesses.

BUSINESS: ${tenant.businessName} — ${tenant.businessType} business
DESCRIPTION: ${tenant.businessDescription || 'Not provided'}

${orderSummary ? `CUSTOMER DATA (from ${orderSummary.totalOrders} real orders):
- Average order value: ₹${orderSummary.avgOrderValue}
- Top selling products: ${orderSummary.topProducts.join(', ')}
- Customer cities: ${orderSummary.cities.join(', ')}
` : 'No order data yet — generate general targeting for this business type.'}

${leads.length > 0 ? `AD LEAD DATA: ${leads.length} leads converted from ads` : ''}

Generate a complete Meta Ads targeting brief in JSON format only. No markdown. No explanation outside JSON:
{
  "summary": "2-sentence overview of ideal customer",
  "ageMin": number,
  "ageMax": number,
  "genders": ["male"|"female"|"all"],
  "topLocations": ["city1", "city2", ...up to 8 Indian cities],
  "interests": ["interest1", ...up to 12 Meta interest keywords relevant to this business],
  "languages": ["Tamil"|"Hindi"|"English" — pick relevant ones],
  "audienceSize": "estimated audience size description",
  "bestTimeToRun": "best days/times to run ads",
  "reasoning": "3-4 sentences explaining why this targeting will work",
  "lookalikeTip": "specific advice on building lookalike audience",
  "budgetRecommendation": "recommended daily budget range in INR with reasoning"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, data: json };
  } catch (err) {
    logger.error('Targeting brief error:', err);
    return { success: false, error: err.message };
  }
}

// ── 2. GENERATE AD COPY VARIANTS ─────────────────────────────────
async function generateAdCopy(tenant, productName, productDescription, productPrice, campaignGoal = 'leads') {
  try {
    const prompt = `You are an expert Instagram/Facebook ad copywriter for Indian fashion and retail businesses.

BUSINESS: ${tenant.businessName}
PRODUCT: ${productName}
DESCRIPTION: ${productDescription || ''}
PRICE: ₹${productPrice}
GOAL: ${campaignGoal === 'leads' ? 'Generate lead form submissions' : 'Drive direct sales'}
TONE: Warm, exciting, authentic — suitable for Indian audience

Generate 3 ad copy variants in JSON only. Each variant should feel different:
- Variant A: Urgency/scarcity angle
- Variant B: Benefit/lifestyle angle  
- Variant C: Social proof/trust angle

{
  "variants": [
    {
      "variant": "A",
      "angle": "urgency",
      "headline": "max 40 chars",
      "primaryText": "max 125 chars — the main ad text shown above the image",
      "description": "max 30 chars — shown below headline",
      "hashtags": ["tag1","tag2","tag3","tag4","tag5"],
      "score": 0-100,
      "whyItWorks": "one sentence"
    }
  ],
  "bestVariant": "A|B|C",
  "bestVariantReason": "why this one will likely perform best"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, data: json };
  } catch (err) {
    logger.error('Ad copy generation error:', err);
    return { success: false, error: err.message };
  }
}

// ── 3. ANALYSE CAMPAIGN PERFORMANCE ──────────────────────────────
async function analysePerformance(tenant, campaign, adLeads) {
  try {
    const m = campaign.metrics;
    const convertedLeads = adLeads.filter(l => l.status === 'ordered').length;
    const totalLeads = adLeads.length;
    const convRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    const prompt = `You are a Meta ads performance analyst for Indian businesses.

CAMPAIGN: "${campaign.name}"
OBJECTIVE: ${campaign.objective}
PRODUCT/AUDIENCE: ${campaign.audience?.name || campaign.name}

METRICS:
- Impressions: ${m.impressions.toLocaleString()}
- Reach: ${m.reach.toLocaleString()}
- Clicks: ${m.clicks}
- CTR: ${m.ctr}%
- Leads generated: ${m.leads}
- Ad spend: ₹${m.spend}
- Cost per lead: ₹${m.cpl}
- Orders placed: ${convertedLeads}
- Conversion rate: ${convRate}%
- Revenue: ₹${m.revenue}
- ROAS: ${m.roas}x

Analyse this campaign and provide actionable insights in JSON only:
{
  "overallScore": 0-100,
  "verdict": "one sentence summary — good/bad/needs improvement",
  "strengths": ["what's working — max 3 points"],
  "issues": ["what's not working — max 3 points"],
  "recommendations": [
    { "action": "specific change to make", "impact": "expected result", "priority": "high|medium|low" }
  ],
  "audienceInsight": "what the data tells us about the audience",
  "nextStep": "single most important thing to do right now"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { success: true, data: json };
  } catch (err) {
    logger.error('Performance analysis error:', err);
    return { success: false, error: err.message };
  }
}

// ── 4. GENERATE LOOKALIKE AUDIENCE EXPORT ────────────────────────
async function buildLookalikeExport(tenant) {
  try {
    // Get all converted customers' phone numbers
    const orders = await SalesOrder.find({
      tenantId: tenant._id,
      'customer.phone': { $exists: true, $ne: null },
      status: { $in: ['delivered', 'confirmed', 'shipped'] }
    }).select('customer.phone customer.name').lean();

    const adLeadConverted = await AdLead.find({
      tenantId: tenant._id,
      phone: { $exists: true, $ne: null },
      status: 'ordered'
    }).select('phone name').lean();

    // Combine and deduplicate
    const allCustomers = new Map();

    orders.forEach(o => {
      if (o.customer?.phone) {
        const clean = o.customer.phone.replace(/\D/g, '');
        if (clean.length >= 10) {
          allCustomers.set(clean, { phone: clean, name: o.customer.name || '' });
        }
      }
    });

    adLeadConverted.forEach(l => {
      if (l.phone) {
        const clean = l.phone.replace(/\D/g, '');
        if (clean.length >= 10) allCustomers.set(clean, { phone: clean, name: l.name || '' });
      }
    });

    const customers = Array.from(allCustomers.values());

    // Build CSV for Meta Custom Audience upload
    // Meta requires: phone (with country code), optional: first_name, last_name
    const csvRows = [
      'phone,fn', // Meta column headers
      ...customers.map(c => {
        const phone = c.phone.startsWith('91') ? `+${c.phone}` : `+91${c.phone.slice(-10)}`;
        const name = c.name?.split(' ')[0] || '';
        return `${phone},${name}`;
      })
    ];

    return {
      success: true,
      count: customers.length,
      csv: csvRows.join('\n'),
      instructions: [
        'Go to Meta Ads Manager → Audiences → Create Audience',
        'Select "Custom Audience" → "Customer List"',
        'Upload this CSV file',
        'Wait 24-48 hours for Meta to match your customers',
        'Then create "Lookalike Audience" from this Custom Audience',
        'Select 1-3% similarity for best results in India',
        'This audience will find people similar to your actual buyers'
      ]
    };
  } catch (err) {
    logger.error('Lookalike export error:', err);
    return { success: false, error: err.message };
  }
}

// ── 5. AI FIRST MESSAGE FOR AD LEADS ─────────────────────────────
async function generateAdLeadMessage(tenant, lead, campaignName, productName) {
  try {
    const prompt = `Write a WhatsApp first message for a lead who just submitted an Instagram Lead Ad form.

BUSINESS: ${tenant.businessName}
AD CAMPAIGN: ${campaignName}
PRODUCT THEY SAW: ${productName || 'our products'}
LEAD NAME: ${lead.name || 'there'}
LANGUAGE: ${tenant.aiSettings?.language === 'ta' ? 'Tamil' : tenant.aiSettings?.language === 'hi' ? 'Hindi' : 'English (or match their location)'}
TONE: ${tenant.aiSettings?.tone || 'friendly'}

Rules:
- Reference the specific ad/product they saw
- Sound personal, not robotic
- Create curiosity / excitement
- End with a soft question to get them talking
- Max 3 sentences
- Use 1-2 emojis

Reply with just the message text, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });

    return { success: true, message: response.content[0].text.trim() };
  } catch (err) {
    return { success: false, message: `Hi ${lead.name || 'there'}! Thanks for your interest in ${tenant.businessName}. How can I help you today? 😊` };
  }
}

module.exports = {
  generateTargetingBrief,
  generateAdCopy,
  analysePerformance,
  buildLookalikeExport,
  generateAdLeadMessage,
};
