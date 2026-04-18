// ================================================================
// ADD THIS TO backend/src/index.js
// ================================================================
//
// const adsRoutes = require('./routes/ads');
// app.use('/api/ads', adsRoutes);
//
// Also add to .env:
// META_WEBHOOK_VERIFY_TOKEN=your_random_verify_token_for_lead_ads
//
// ================================================================
// META LEAD ADS WEBHOOK SETUP
// ================================================================
//
// Your webhook URL for Lead Ads:
// https://your-backend.railway.app/api/ads/webhook/{tenantId}
//
// Steps to connect:
// 1. Go to developers.facebook.com → Your App → Webhooks
// 2. Subscribe to "Page" object
// 3. Add callback URL: https://your-backend.railway.app/api/ads/webhook/{tenantId}
// 4. Verify token: whatever you set as META_WEBHOOK_VERIFY_TOKEN
// 5. Subscribe to field: "leadgen"
//
// For Instagram Lead Ads specifically:
// 1. Your Instagram must be connected to a Facebook Page
// 2. Meta App → Products → Instagram → Webhooks
// 3. Add same webhook URL
// 4. Subscribe to: "messages" and "leadgen"
//
// ================================================================
// FRONTEND SIDEBAR — Add to NAV in Sidebar.js
// ================================================================
//
// { href: '/dashboard/ads',           icon: '📢', label: 'Instagram Ads', badge: 'new' },
// { href: '/dashboard/ads/leads',     icon: '🎯', label: 'Ad Leads' },
// { href: '/dashboard/ads/analytics', icon: '📊', label: 'Ad Analytics' },
//
// ================================================================
// COMPLETE FILE STRUCTURE
// ================================================================
//
// backend/src/
//   models/
//     AdCampaign.js    ← Campaign + creative + audience + metrics
//     AdLead.js        ← Every lead from every ad
//   routes/
//     ads.js           ← All API endpoints
//   services/
//     adIntelligence.js  ← AI targeting, copy, analysis, lookalike
//     metaAdsService.js  ← Webhook handling, metrics sync
//
// frontend/src/app/dashboard/ads/
//   page.js            ← Main ads dashboard
//   create/page.js     ← 5-step campaign wizard
//   leads/page.js      ← All ad leads table
//   analytics/page.js  ← Performance + lookalike + AI insights

module.exports = {};
