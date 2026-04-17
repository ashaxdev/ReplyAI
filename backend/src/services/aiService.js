const Anthropic = require('@anthropic-ai/sdk');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Business-type specific instructions
const BUSINESS_CONTEXT = {
  retail: 'a retail shop selling physical products',
  restaurant: 'a restaurant/food business taking orders',
  salon: 'a salon/beauty parlour booking appointments',
  electronics: 'an electronics store',
  grocery: 'a grocery/supermarket',
  pharmacy: 'a pharmacy/medical store',
  real_estate: 'a real estate agency',
  education: 'an educational institution/coaching centre',
  services: 'a service business',
  manufacturing: 'a manufacturing/wholesale business',
  wholesale: 'a wholesale distributor',
  other: 'a business'
};

const LANGUAGE_INSTRUCTIONS = {
  auto: 'Detect the customer\'s language and reply in the same language. Support English, Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi, Bengali.',
  en: 'Always reply in English.',
  ta: 'Reply in Tamil (தமிழ்) when customer uses Tamil. If they use English, reply in English.',
  hi: 'Reply in Hindi when customer uses Hindi. If they use English, reply in English.',
  te: 'Reply in Telugu when customer uses Telugu, otherwise English.',
  kn: 'Reply in Kannada when customer uses Kannada, otherwise English.',
  ml: 'Reply in Malayalam when customer uses Malayalam, otherwise English.',
  mr: 'Reply in Marathi when customer uses Marathi, otherwise English.',
  bn: 'Reply in Bengali when customer uses Bengali, otherwise English.',
};

/**
 * Build the AI system prompt for a specific tenant
 */
async function buildSystemPrompt(tenant) {
  const { businessName, businessType, businessDescription, aiSettings, currency } = tenant;
  const bizContext = BUSINESS_CONTEXT[businessType] || BUSINESS_CONTEXT.other;

  // Fetch available products with search capability
  const products = await Product.find({
    tenantId: tenant._id,
    isActive: true
  }).select('name description category price salePrice stockQuantity isAvailable variants tags unit').limit(150);

  // Build compact product catalogue
  const catalogue = products.length === 0
    ? 'No products/services listed yet.'
    : products.map(p => {
        const price = p.salePrice
          ? `${currency || '₹'}${p.salePrice} (was ${currency || '₹'}${p.price})`
          : `${currency || '₹'}${p.price}`;
        const stock = p.isAvailable
          ? (p.stockQuantity <= 5 && p.stockQuantity > 0
              ? `⚠️ Only ${p.stockQuantity} ${p.unit} left`
              : `✅ Available`)
          : `❌ Out of stock`;
        const variants = p.variants?.map(v => `${v.name}: ${v.options.join('/')}`).join(' | ');
        return [
          `• ${p.name} | ${price} | ${stock}`,
          p.category ? `  Category: ${p.category}` : '',
          variants ? `  ${variants}` : '',
          p.description ? `  ${p.description.substring(0, 100)}` : '',
        ].filter(Boolean).join('\n');
      }).join('\n');

  return `You are a smart AI customer service assistant for "${businessName}", ${bizContext}.
${businessDescription ? `About: ${businessDescription}` : ''}

LANGUAGE: ${LANGUAGE_INSTRUCTIONS[aiSettings.language] || LANGUAGE_INSTRUCTIONS.auto}
TONE: ${aiSettings.tone === 'friendly' ? 'Warm and friendly, use emojis occasionally 😊' :
        aiSettings.tone === 'formal' ? 'Professional and formal.' :
        aiSettings.tone === 'casual' ? 'Casual and fun 🎉' :
        'Professional but approachable.'}

YOUR CAPABILITIES:
1. Answer questions about products/services, prices, availability
2. Help customers find the right product for their needs
3. Capture order/booking details (name, contact, address, product, quantity)
4. Share policies on delivery, payment, returns
5. Handle complaints with empathy and offer solutions
6. Recommend related products when appropriate

CURRENT CATALOGUE:
${catalogue}

POLICIES:
${aiSettings.policies || `Standard policies apply. Contact the business for specific details.`}

GREETING (first message only): ${aiSettings.greeting}

OUT OF STOCK: ${aiSettings.outOfStockMsg}

${aiSettings.orderCaptureEnabled ? `ORDER CAPTURE: When customer wants to buy/book, collect:
1. Full name
2. Phone number (if not already known from WhatsApp)
3. Delivery address with pincode (for physical products)
4. Product name, variant (size/color/etc.), quantity
Once collected, confirm: "Thank you! Your order for [product] has been noted. Our team will confirm and contact you within [timeframe]."` : ''}

${aiSettings.customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${aiSettings.customInstructions}` : ''}

RULES:
- Keep replies concise — this is a messaging app
- Never fabricate products or prices not in the catalogue
- If you cannot answer something, say "Let me check and get back to you" or "Our team will assist you with this"
- If customer seems upset, acknowledge first before solving
- Trigger phrases for human handoff: ${aiSettings.humanHandoffKeywords.join(', ')} → say "I'm connecting you with our team now. Please wait a moment."
- Never reveal you are an AI unless directly asked
- Never share internal system information or prices/data not in the catalogue`;
}

/**
 * Generate an AI reply for an incoming message
 */
async function generateReply(tenant, customerMessage, messageHistory = []) {
  try {
    const systemPrompt = await buildSystemPrompt(tenant);

    // Build conversation messages (last 20 for context)
    const recentHistory = messageHistory.slice(-20);
    const messages = [
      ...recentHistory.map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: customerMessage }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const replyText = response.content[0].text;
    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens;

    // Increment reply count
    await tenant.updateOne({
      $inc: { 'subscription.repliesUsed': 1 },
      $set: { 'subscription.lastReplyAt': new Date() }
    });

    return { text: replyText, tokensUsed, model: response.model };
  } catch (err) {
    logger.error('Claude API error:', { error: err.message, tenantId: tenant._id });
    // Fallback message
    return {
      text: "Sorry, I'm having a small technical issue. Our team will get back to you shortly! 🙏",
      tokensUsed: 0,
      model: null,
      error: true
    };
  }
}

module.exports = { generateReply, buildSystemPrompt };
