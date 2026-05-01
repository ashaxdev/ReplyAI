/*
================================================================
MULTI-TENANT ADS ARCHITECTURE
================================================================

Each tenant (your client / shop owner) gets:
  - Their OWN Meta App credentials (or uses your platform app)
  - Their OWN ad campaigns, leads, targeting
  - Their OWN lookalike audience exports
  - Their OWN webhook endpoint:
      /webhooks/ads/:tenantId  ← unique per tenant
  - ZERO access to any other tenant's data
  - Their OWN AI targeting brief (based on THEIR customer data)

Data isolation is enforced at every DB query:
  { tenantId: req.tenant._id }   ← mandatory filter on ALL queries

================================================================
HOW EACH TENANT CONNECTS META
================================================================

Option A: Each tenant creates their OWN Meta App
  - Full control, their own tokens
  - Best for large clients

Option B: You run ONE Meta App as a platform
  - Clients connect via Facebook Login / OAuth
  - You get a page access token scoped to their account
  - Easier for small clients (no dev account needed)
  - Meta calls this "Meta Business Extension (MBE)"

We implement BOTH options below.

================================================================
TENANT AD SETTINGS STORED IN TENANT MODEL
================================================================

platforms: [
  {
    platform: 'meta_ads',
    adAccountId: '...',          ← their Meta Ad Account ID
    accessTokenEncrypted: '...',  ← AES-256 encrypted
    pageId: '...',               ← their Facebook Page ID
    instagramActorId: '...',     ← their IG business account
    webhookVerifyToken: '...',   ← unique per tenant
    isConnected: true,
    metaAppId: '...',            ← if using Option A
  }
]

================================================================
*/
