// ================================================================
// This file is a reference index — each section below corresponds
// to a separate page.js file in the dashboard.
// Copy each section into its respective folder.
// ================================================================

// ── src/app/dashboard/products/page.js ───────────────────────────
// Full universal product catalogue manager
// (Same logic as v1 but with variant support and business-type agnostic)

// ── src/app/dashboard/conversations/page.js ──────────────────────
// Two-pane chat UI with platform/status filters

// ── src/app/dashboard/leads/page.js ──────────────────────────────
// Lead pipeline with kanban-style status updates

// ── src/app/dashboard/connect/page.js ────────────────────────────
// Platform connection + webhook instructions

// ── src/app/dashboard/settings/page.js ───────────────────────────
// Business settings + AI settings tabs

// ── src/app/dashboard/team/page.js ───────────────────────────────
// Team member management

// ── src/app/dashboard/audit/page.js ──────────────────────────────
// Security audit log

// ── src/app/dashboard/billing/page.js ────────────────────────────
// Plan overview + upgrade

// NOTE: These pages follow the exact same pattern as the v1 pages
// but use the new API endpoints and styling.
// See the individual page files already in the project.
// All frontend pages from v1 (repliai-saas.zip) work here —
// just update the API calls to use the new endpoint paths:
//   /api/products  →  same
//   /api/conversations  →  same
//   /api/platforms  →  was /api/settings/platforms
//   /api/settings/ai  →  same
//   /api/settings/business  →  new (was /api/settings/shop)
//   /api/dashboard/stats  →  same
//   /api/team  →  new
//   /api/audit  →  new
