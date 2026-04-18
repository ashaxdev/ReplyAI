const Anthropic = require('@anthropic-ai/sdk');
const Product = require('../models/Product');
const SalesOrder = require('../models/SalesOrder');
const logger = require('../utils/logger');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BUSINESS_CONTEXT = {
  retail: 'a retail shop selling physical products',
  restaurant: 'a restaurant/food business taking orders',
  salon: 'a salon/beauty parlour booking appointments',
  electronics: 'an electronics store',
  grocery: 'a grocery/supermarket',
  pharmacy: 'a pharmacy/medical store',
  real_estate: 'a real estate agency',
  education: 'an educational institution',
  services: 'a service business',
  manufacturing: 'a manufacturing/wholesale business',
  wholesale: 'a wholesale distributor',
  other: 'a business'
};

const LANGUAGE_MAP = {
  auto: 'Detect the customer language and reply in that same language. Support English, Tamil, Hindi, Telugu, Kannada, Malayalam, Marathi, Bengali.',
  en: 'Always reply in English.',
  ta: 'Reply in Tamil when customer uses Tamil; English otherwise.',
  hi: 'Reply in Hindi when customer uses Hindi; English otherwise.',
  te: 'Reply in Telugu when customer uses Telugu; English otherwise.',
  kn: 'Reply in Kannada when customer uses Kannada; English otherwise.',
  ml: 'Reply in Malayalam when customer uses Malayalam; English otherwise.',
  mr: 'Reply in Marathi when customer uses Marathi; English otherwise.',
  bn: 'Reply in Bengali when customer uses Bengali; English otherwise.',
};

/**
 * Build the SALES-FOCUSED system prompt
 */
async function buildSalesPrompt(tenant) {
  const { businessName, businessType, businessDescription, aiSettings, currency = '₹' } = tenant;

  // Fetch products with stock data
  const products = await Product.find({ tenantId: tenant._id, isActive: true })
    .select('name description category price salePrice stockQuantity isAvailable variants tags unit')
    .lean()
    .limit(150);

  // Build product catalogue with low-stock flags for urgency
  const catalogue = products.length === 0 ? 'No products listed yet.' :
    products.map(p => {
      const price = p.salePrice ? `${currency}${p.salePrice} (was ${currency}${p.price} — ON SALE!)` : `${currency}${p.price}`;
      const urgency = !p.isAvailable ? '❌ OUT OF STOCK' :
        p.stockQuantity <= 3 ? `🔥 ONLY ${p.stockQuantity} LEFT` :
        p.stockQuantity <= 10 ? `⚠️ Low stock (${p.stockQuantity})` : `✅ In stock`;
      const variants = p.variants?.map(v => `${v.name}: ${v.options.join('/')}`).join(' | ');
      return [
        `• ${p.name} | ${price} | ${urgency}`,
        p.category ? `  Category: ${p.category}` : '',
        variants ? `  ${variants}` : '',
        p.description ? `  ${p.description.substring(0, 120)}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n');

  const tone = aiSettings?.tone || 'friendly';
  const toneGuide = {
    friendly: 'Warm, enthusiastic, use 1-2 emojis per message. Feel like a helpful friend.',
    formal: 'Professional and polished. No emojis.',
    casual: 'Fun, relaxed, use emojis freely. Like texting a friend.',
    professional: 'Confident and clear. Minimal emojis.',
  }[tone] || 'Warm and helpful.';

  return `You are an expert AI sales assistant for "${businessName}", ${BUSINESS_CONTEXT[businessType] || 'a business'}.
${businessDescription ? `About: ${businessDescription}` : ''}

LANGUAGE: ${LANGUAGE_MAP[aiSettings?.language || 'auto']}
TONE: ${toneGuide}

═══════════════════════════════
SALES CONVERSION PLAYBOOK
═══════════════════════════════

Your PRIMARY goal is to CONVERT inquiries into ORDERS. Follow this playbook:

**1. PRICE/PRODUCT INQUIRY → ADD URGENCY + SOFT CLOSE**
When customer asks about price/product:
- Give the info clearly
- Add a scarcity/urgency nudge if stock is low: "Only 3 left!"
- Soft close: "Would you like to order? I can help you right now 😊"
- If on sale: "This is on sale today — great time to grab it!"

**2. INTEREST SHOWN → GUIDE TO ORDER**
When customer says "nice", "looks good", "interested":
- Acknowledge positively
- Ask their preferred variant (size/color) if applicable
- Move toward: "Shall I book one for you? Just share your name and address"

**3. HESITATION / OBJECTION → HANDLE AND RECOVER**
When customer says "let me think", "maybe later", "expensive":
- Acknowledge empathy: "Totally understand!"
- Offer solutions:
  - If price concern: "We have COD available so you only pay on delivery"
  - If unsure about product: "We have easy returns within 7 days"
  - If comparing: "This is our bestseller — most customers love it"
- Re-close: "Want me to keep one aside for you?"

**4. READY TO ORDER → FAST CAPTURE (2-3 messages max)**
Collect in this order, one ask at a time:
  Message 1: "Excellent! What's your full name and delivery address with pincode?"
  Message 2: "Perfect! Which [size/color/variant] would you like, and how many?"
  Message 3: Confirm everything + payment: "Order confirmed! 🎉 Here's your summary:
  ✅ [Product] x [Qty] — ${currency}[Total]
  📦 Delivering to: [Address]
  💳 Payment: COD / UPI — our team will confirm shortly!"

**5. POST-ORDER → CROSS-SELL**
After confirming order:
- "Customers who bought this also love [related product] — want to add it?"
- "Add [complementary item] for just ${currency}[price] more?"

**6. SILENT AFTER INTEREST → RE-ENGAGE**
If conversation stalled after interest was shown:
- "Hi! Just checking — the [product] you were looking at is still available. Want me to reserve it for you? 😊"

═══════════════════════════════
ORDER CAPTURE FORMAT
═══════════════════════════════
When you have all order details, output this EXACT block at the end of your message
(hidden from customer, used by system to save the order):

[ORDER_CAPTURE]
customer_name: [full name]
phone: [phone if given, else "from_platform"]
address: [full address with pincode]
items: [product name | variant | qty | unit_price]
items: [repeat for each product]
total: [calculated total]
payment: [cod/upi/pending]
[/ORDER_CAPTURE]

═══════════════════════════════
PRODUCT CATALOGUE
═══════════════════════════════
${catalogue}

POLICIES:
${aiSettings?.policies || 'Standard: COD available. Delivery 3-5 days. Returns within 7 days for defects.'}

HUMAN HANDOFF KEYWORDS: ${(aiSettings?.humanHandoffKeywords || ['agent','human','complaint','manager']).join(', ')}
→ When triggered: "Let me connect you with our team right away! Please wait a moment 🙏"

RULES:
- Never make up products not in the catalogue
- Keep replies SHORT (this is WhatsApp/Instagram — not email)
- One question at a time during order capture
- Always aim to close the sale in ≤5 messages
- If out of stock: suggest the nearest alternative from catalogue
- Never say you are an AI unless directly asked`;
}

/**
 * Parse ORDER_CAPTURE block from AI response
 */
function parseOrderCapture(text) {
  const match = text.match(/\[ORDER_CAPTURE\]([\s\S]*?)\[\/ORDER_CAPTURE\]/);
  if (!match) return null;

  const block = match[1];
  const get = (key) => {
    const m = block.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : null;
  };

  // Parse multiple items lines
  const itemLines = [...block.matchAll(/items:\s*(.+)/g)].map(m => m[1].trim());
  const items = itemLines.map(line => {
    const parts = line.split('|').map(s => s.trim());
    return {
      productName: parts[0] || 'Unknown',
      variant: parts[1] || '',
      quantity: parseInt(parts[2]) || 1,
      unitPrice: parseFloat(parts[3]?.replace(/[^0-9.]/g, '')) || 0,
      totalPrice: (parseInt(parts[2]) || 1) * (parseFloat(parts[3]?.replace(/[^0-9.]/g, '')) || 0),
    };
  });

  const total = parseFloat(get('total')?.replace(/[^0-9.]/g, '')) || items.reduce((s, i) => s + i.totalPrice, 0);

  return {
    customer_name: get('customer_name'),
    phone: get('phone'),
    address: get('address'),
    items,
    total,
    payment: get('payment') || 'pending',
  };
}

/**
 * Clean AI response — remove ORDER_CAPTURE block before sending to customer
 */
function cleanResponse(text) {
  return text.replace(/\[ORDER_CAPTURE\][\s\S]*?\[\/ORDER_CAPTURE\]/g, '').trim();
}

/**
 * Main: generate AI reply with sales focus
 */
async function generateSalesReply(tenant, customerMessage, conversationHistory = [], conversationId = null) {
  try {
    const systemPrompt = await buildSalesPrompt(tenant);
    const recentHistory = conversationHistory.slice(-20);

    const messages = [
      ...recentHistory.map(m => ({
        role: m.direction === 'inbound' ? 'user' : 'assistant',
        content: m.content
      })),
      { role: 'user', content: customerMessage }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].text;
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Check for order capture
    const orderData = parseOrderCapture(rawText);
    const cleanText = cleanResponse(rawText);

    // Save order if captured
    if (orderData && conversationId && tenant._id) {
      try {
        await saveAiOrder(tenant, orderData, conversationId);
        logger.info('AI order captured', { tenantId: tenant._id, customer: orderData.customer_name, total: orderData.total });
      } catch (err) {
        logger.error('Failed to save AI order:', err);
      }
    }

    // Update reply count
    await tenant.updateOne({ $inc: { 'subscription.repliesUsed': 1 } });

    return {
      text: cleanText,
      tokensUsed,
      model: response.model,
      orderCaptured: !!orderData,
      orderData: orderData || null,
    };
  } catch (err) {
    logger.error('Sales AI error:', { error: err.message, tenantId: tenant._id });
    return {
      text: "Sorry, I'm having a small technical issue. Our team will get back to you shortly! 🙏",
      tokensUsed: 0, model: null, orderCaptured: false, orderData: null, error: true
    };
  }
}

/**
 * Save AI-captured order to database
 */
async function saveAiOrder(tenant, orderData, conversationId) {
  const items = (orderData.items || []).map(item => ({
    productName: item.productName,
    variant: item.variant,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || 0,
    totalPrice: item.totalPrice || 0,
  }));

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);

  const order = await SalesOrder.create({
    tenantId: tenant._id,
    conversationId,
    platform: 'whatsapp', // will be overridden by caller
    customer: {
      name: orderData.customer_name || 'Unknown',
      phone: orderData.phone !== 'from_platform' ? orderData.phone : undefined,
      address: orderData.address ? { line1: orderData.address } : undefined,
    },
    items,
    subtotal,
    total: orderData.total || subtotal,
    paymentMethod: orderData.payment === 'cod' ? 'cod' : orderData.payment === 'upi' ? 'upi' : 'pending',
    status: 'new',
    capturedByAi: true,
  });

  // Update conversation lead status
  const Conversation = require('../models/Conversation');
  await Conversation.findByIdAndUpdate(conversationId, {
    leadStatus: 'ordered',
    orderValue: order.total,
  });

  return order;
}

/**
 * Generate re-engagement message for silent leads
 */
async function generateReEngagement(tenant, customerName, productName) {
  const bizName = tenant.businessName;
  const msgs = [
    `Hi ${customerName || 'there'}! 👋 Just checking in — the ${productName || 'item'} you were looking at is still available at ${bizName}. Would you like to place an order? 😊`,
    `Hey! The ${productName || 'product'} from ${bizName} is still in stock — don't miss out! Want me to book one for you? 🛍️`,
    `Hi ${customerName || 'there'}! Following up from ${bizName} — the ${productName || 'item'} you inquired about is available. Just say "yes" and I'll guide you through the order! 🎉`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

module.exports = { generateSalesReply, generateReEngagement, parseOrderCapture, saveAiOrder };
