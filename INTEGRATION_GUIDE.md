# ⚡ ReplyAI — Multi-Tenant Ads Module
# Complete Integration Guide — Where To Add Each File
# ================================================================

## YOUR EXISTING PROJECT STRUCTURE (before changes)
```
repliai-enterprise/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Tenant.js          ← MODIFY THIS
│   │   │   ├── Product.js
│   │   │   ├── Conversation.js
│   │   │   └── AuditLog.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── security.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── conversations.js
│   │   │   ├── platforms.js
│   │   │   ├── settings.js
│   │   │   ├── dashboard.js
│   │   │   ├── team.js
│   │   │   └── audit.js
│   │   ├── services/
│   │   │   └── aiService.js
│   │   ├── webhooks/
│   │   │   └── index.js          ← MODIFY THIS
│   │   └── index.js              ← MODIFY THIS
│   └── package.json              ← MODIFY THIS
└── frontend/
    └── src/
        ├── app/
        │   └── dashboard/
        │       ├── layout.js
        │       ├── page.js
        │       └── ...
        └── components/
            └── Sidebar.js        ← MODIFY THIS
```

## AFTER ADDING ADS MODULE
```
repliai-enterprise/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Tenant.js          ← MODIFIED
│   │   │   ├── AdCampaign.js      ← NEW (copy from ads module)
│   │   │   ├── AdLead.js          ← NEW (copy from ads module)
│   │   │   └── ...existing...
│   │   ├── routes/
│   │   │   ├── ads.js             ← NEW (copy from ads module)
│   │   │   ├── adConnection.js    ← NEW (copy from ads module)
│   │   │   └── ...existing...
│   │   ├── services/
│   │   │   ├── adIntelligence.js  ← NEW (copy from ads module)
│   │   │   ├── metaAdsService.js  ← NEW (copy from ads module)
│   │   │   └── aiService.js
│   │   ├── webhooks/
│   │   │   ├── index.js           ← MODIFIED
│   │   │   └── adsWebhook.js      ← NEW (copy from ads module)
│   │   └── index.js               ← MODIFIED
└── frontend/
    └── src/
        └── app/
            └── dashboard/
                └── ads/           ← NEW FOLDER
                    ├── page.js
                    ├── create/page.js
                    ├── leads/page.js
                    └── analytics/page.js
```

================================================================
STEP 1 — COPY NEW FILES
================================================================

Copy these files from the ads module into your project:

FROM: repliai-multitenant-ads/backend/src/models/AdCampaign.js
TO:   repliai-enterprise/backend/src/models/AdCampaign.js

FROM: repliai-multitenant-ads/backend/src/models/AdLead.js
TO:   repliai-enterprise/backend/src/models/AdLead.js

FROM: repliai-multitenant-ads/backend/src/routes/ads.js
TO:   repliai-enterprise/backend/src/routes/ads.js

FROM: repliai-multitenant-ads/backend/src/routes/adConnection.js
TO:   repliai-enterprise/backend/src/routes/adConnection.js

FROM: repliai-multitenant-ads/backend/src/webhooks/adsWebhook.js
TO:   repliai-enterprise/backend/src/webhooks/adsWebhook.js

FROM: repliai-ads/backend/src/services/adIntelligence.js
TO:   repliai-enterprise/backend/src/services/adIntelligence.js

FROM: repliai-ads/backend/src/services/metaAdsService.js
TO:   repliai-enterprise/backend/src/services/metaAdsService.js

FROM: repliai-ads/frontend/src/app/dashboard/ads/page.js
TO:   repliai-enterprise/frontend/src/app/dashboard/ads/page.js

FROM: repliai-ads/frontend/src/app/dashboard/ads/create/page.js
TO:   repliai-enterprise/frontend/src/app/dashboard/ads/create/page.js

FROM: repliai-ads/frontend/src/app/dashboard/ads/leads/page.js
TO:   repliai-enterprise/frontend/src/app/dashboard/ads/leads/page.js

FROM: repliai-ads/frontend/src/app/dashboard/ads/analytics/page.js
TO:   repliai-enterprise/frontend/src/app/dashboard/ads/analytics/page.js

================================================================
STEP 2 — MODIFY backend/src/models/Tenant.js
================================================================

Find the PlatformConnectionSchema in your Tenant.js.
It currently looks like this:

const PlatformConnectionSchema = new mongoose.Schema({
  platform: { type: String, enum: ['whatsapp', 'instagram'], required: true },
  phoneNumberId: String,
  instagramAccountId: String,
  accessTokenEncrypted: String,
  webhookVerifyToken: String,
  isConnected: { type: Boolean, default: false },
  connectedAt: Date,
  lastActivity: Date,
  messagesSent: { type: Number, default: 0 }
}, { _id: false });

REPLACE IT WITH THIS:

const PlatformConnectionSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['whatsapp', 'instagram', 'facebook', 'meta_ads'],  // ← ADD 'facebook', 'meta_ads'
    required: true
  },
  // WhatsApp
  phoneNumberId: String,
  // Instagram DMs
  instagramAccountId: String,
  // Meta Ads (NEW fields below)
  adAccountId: String,
  pageId: String,
  instagramActorId: String,
  pixelId: String,
  metaAppId: String,
  // Stats cache (NEW)
  totalAdSpend:      { type: Number, default: 0 },
  totalLeads:        { type: Number, default: 0 },
  totalConversions:  { type: Number, default: 0 },
  // Shared fields (keep existing)
  accessTokenEncrypted: String,
  webhookVerifyToken: String,
  isConnected: { type: Boolean, default: false },
  connectedAt: Date,
  lastActivity: Date,
  messagesSent: { type: Number, default: 0 },
  lastSyncedAt: Date,
}, { _id: false });

================================================================
STEP 3 — MODIFY backend/src/index.js
================================================================

Find where your routes are registered. Add these 3 lines:

// EXISTING routes (already there):
app.use('/api/auth',          authRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/platforms',     platformRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/team',          teamRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/webhooks',          webhookRoutes);

// ADD THESE 3 NEW LINES:
const adsRoutes          = require('./routes/ads');
const adConnectionRoutes = require('./routes/adConnection');
const adsWebhook         = require('./webhooks/adsWebhook');

app.use('/api/ads',            adsRoutes);
app.use('/api/ads/connection', adConnectionRoutes);
app.use('/webhooks/ads',       adsWebhook);

================================================================
STEP 4 — ADD ENV VARIABLES
================================================================

Add these to your Render environment variables
(Render Dashboard → Your Service → Environment):

META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=any_random_string_for_global_verify

Note: Each tenant also stores their own access token in MongoDB
(encrypted). The META_APP_SECRET above is YOUR app-level secret
used to verify webhook signatures from Meta.

================================================================
STEP 5 — MODIFY frontend/src/components/Sidebar.js
================================================================

Find the NAV array and add these items:

const NAV = [
  { href: '/dashboard',               icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/orders',        icon: '🛒', label: 'Orders' },
  { href: '/dashboard/products',      icon: '📦', label: 'Products' },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversations' },
  { href: '/dashboard/leads',         icon: '🎯', label: 'Leads' },
  { href: '/dashboard/reports',       icon: '📈', label: 'Sales Reports' },

  // ADD THESE 3 NEW ITEMS:
  { href: '/dashboard/ads',           icon: '📢', label: 'Instagram Ads', badge: 'new' },
  { href: '/dashboard/ads/leads',     icon: '🎯', label: 'Ad Leads' },
  { href: '/dashboard/ads/analytics', icon: '📊', label: 'Ad Analytics' },

  { href: '/dashboard/connect',       icon: '🔗', label: 'Platforms' },
  { href: '/dashboard/team',          icon: '👥', label: 'Team' },
  { href: '/dashboard/settings',      icon: '⚙️', label: 'Settings & AI' },
  { href: '/dashboard/audit',         icon: '🔐', label: 'Audit Log' },
  { href: '/dashboard/billing',       icon: '💳', label: 'Billing & Plan' },
];

================================================================
STEP 6 — ADD CONNECT META ADS PAGE TO FRONTEND
================================================================

Create this new file:
repliai-enterprise/frontend/src/app/dashboard/connect/ads/page.js

Content: Use the adConnection route API endpoints:
  GET  /api/ads/connection/status        → check if connected
  POST /api/ads/connection/connect       → connect Meta Ads
  DELETE /api/ads/connection/disconnect  → disconnect
  POST /api/ads/connection/validate-token → test token

Or add a "Connect Meta Ads" section to your existing
/dashboard/connect/page.js alongside WhatsApp and Instagram.

================================================================
STEP 7 — INSTALL NEW PACKAGE
================================================================

No new packages needed. All dependencies (axios, mongoose,
uuid, etc.) are already in your package.json.

================================================================
STEP 8 — HOW EACH TENANT CONNECTS THEIR META ADS
================================================================

Each tenant must do this ONCE in their dashboard:

1. Go to their Meta Business Manager
   → business.facebook.com

2. Create or open their Meta Developer App
   → developers.facebook.com

3. Get their Ad Account ID
   → Meta Ads Manager → Account Settings → top of page
   → Looks like: act_123456789

4. Get their Facebook Page Access Token
   → Meta App → Tools → Graph API Explorer
   → Select their Page → Generate token
   → Required permissions: ads_management, ads_read,
     pages_manage_ads, pages_manage_metadata,
     instagram_manage_messages, leads_retrieval

5. Get their Instagram Actor ID
   → Their Instagram business profile ID

6. In ReplyAI dashboard → Connect Platforms → Meta Ads
   → Enter Ad Account ID, Access Token, Instagram ID
   → Click Connect

7. Dashboard shows:
   Webhook URL: https://your-backend.onrender.com/webhooks/ads/TENANT_ID
   Verify Token: uuid-generated-unique-per-tenant

8. Tenant goes to Meta App → Webhooks → Page
   → Add that Webhook URL + Verify Token
   → Subscribe to: leadgen, messages

DONE — leads from that tenant's ads now flow only to them.

================================================================
STEP 9 — HOW TENANT-SPECIFIC TARGETING WORKS
================================================================

When a tenant clicks "AI Generate Targeting":
  → API calls: POST /api/ads/ai/targeting
  → adIntelligence.js queries SalesOrder WHERE tenantId = THEIR ID
  → Finds THEIR customers' cities, ages, products
  → Claude generates targeting SPECIFIC to their business

When a tenant exports Lookalike Audience:
  → API calls: GET /api/ads/ai/lookalike-export
  → Queries SalesOrder + AdLead WHERE tenantId = THEIR ID
  → CSV contains ONLY their converted customers' phones
  → They upload to Meta → Meta finds similar people

Every tenant sees ONLY their own data. Zero cross-contamination.

================================================================
STEP 10 — TEST THE INTEGRATION
================================================================

1. Start backend: npm run dev
2. Open: http://localhost:4000/health
   Should show: {"status":"ok"}

3. Test webhook verification manually:
   Open browser → paste this URL:
   http://localhost:4000/webhooks/ads/YOUR_TENANT_ID?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123

   Should show: test123

4. If it shows 403:
   → Check tenant is in DB: mongodb compass → tenants collection
   → Check platforms array has { platform: 'meta_ads', webhookVerifyToken: '...' }
   → Check the verify token matches exactly

5. Test the ads API:
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
   http://localhost:4000/api/ads/campaigns

   Should return: {"campaigns":[],"total":0,"page":1}

================================================================
