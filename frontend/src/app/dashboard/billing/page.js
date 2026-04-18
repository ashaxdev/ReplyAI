'use client';
import { useState } from 'react';
import { useAuth } from '../../../lib/AuthContext';

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, yearlyPrice: 0,
    replies: 100, orders: 50, team: 1, platforms: 1,
    color: '#666680',
    features: ['100 AI replies/month', '50 orders tracked', '1 platform (WA or IG)', 'Basic dashboard', '1 team member', 'Community support'],
    missing: ['Sales conversion AI', 'Re-engagement cron', 'CSV export', 'Analytics'],
  },
  {
    id: 'starter', name: 'Starter', price: 999, yearlyPrice: 799,
    replies: 500, orders: 300, team: 3, platforms: 2,
    color: '#F59E0B', popular: false,
    features: ['500 AI replies/month', '300 orders tracked', 'Both platforms (WA + IG)', 'Sales conversion AI', 'Lead pipeline', 'Re-engagement follow-ups', '3 team members', 'CSV export', 'Email support'],
    missing: ['Advanced analytics', 'Custom AI instructions', 'Priority support'],
  },
  {
    id: 'growth', name: 'Growth', price: 2499, yearlyPrice: 1999,
    replies: 2000, orders: 2000, team: 10, platforms: 2,
    color: '#38BDF8', popular: true,
    features: ['2,000 AI replies/month', 'Unlimited orders tracked', 'Both platforms', 'Full sales AI + objection handling', 'Advanced analytics & reports', 'Re-engagement automation', 'Custom AI instructions', '10 team members', 'Audit log', 'Priority email support'],
    missing: [],
  },
  {
    id: 'pro', name: 'Pro', price: 4999, yearlyPrice: 3999,
    replies: 999999, orders: 999999, team: 999, platforms: 2,
    color: '#7C5CFF',
    features: ['Unlimited AI replies', 'Unlimited orders', 'Both platforms', 'Everything in Growth', 'White-label option', 'Unlimited team members', 'Dedicated account manager', 'SLA support', 'Custom integrations on request'],
    missing: [],
  },
];

const RAZORPAY_STEPS = [
  { step: '1', title: 'Create Razorpay account', desc: 'Go to razorpay.com → Sign up → Complete KYC (PAN + bank details for payouts)' },
  { step: '2', title: 'Get API keys', desc: 'Settings → API Keys → Generate Test Keys. For live: switch to Live mode and generate live keys.' },
  { step: '3', title: 'Create subscription plans', desc: 'Products → Subscription Plans → Create Plan for each tier. Set billing cycle: monthly.' },
  { step: '4', title: 'Add keys to .env', desc: 'RAZORPAY_KEY_ID=rzp_live_xxx and RAZORPAY_KEY_SECRET=xxx in your Railway environment variables.' },
  { step: '5', title: 'Webhook setup', desc: 'Razorpay Dashboard → Settings → Webhooks → Add URL: https://your-backend.railway.app/api/billing/webhook' },
  { step: '6', title: 'Webhook secret', desc: 'Copy the webhook secret → add as RAZORPAY_WEBHOOK_SECRET in .env. This verifies payments are genuine.' },
];

const FAQ = [
  { q: 'What payment methods does Razorpay support?', a: 'UPI (PhonePe, GPay, Paytm), Credit/Debit cards (Visa, Mastercard, RuPay), Net Banking (100+ banks), EMI, and wallets. Covers 95%+ of Indian payment methods.' },
  { q: 'How does billing work for my SaaS clients?', a: 'Each client subscribes via Razorpay. Their card/UPI is charged monthly automatically. If payment fails, they get a 3-day grace period then the account downgrades to Free.' },
  { q: 'Can clients cancel anytime?', a: 'Yes. Cancellation takes effect at the end of the current billing period. They retain access until then.' },
  { q: 'Are refunds handled automatically?', a: 'You can issue refunds from the Razorpay dashboard or via API. The webhook updates the order status in your database automatically.' },
  { q: 'What is the Razorpay fee?', a: 'Razorpay charges 2% per transaction for domestic payments. For example, on a ₹999 subscription: ₹20 fee, you receive ₹979.' },
  { q: 'Is GST collected automatically?', a: 'You can configure GST (18% for SaaS) in Razorpay. The invoice is auto-generated with GST. For B2B clients, collect their GSTIN and show it on invoices.' },
];

export default function BillingPage() {
  const { tenant } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [activeTab, setActiveTab] = useState('plans');

  const plan = tenant?.subscription?.plan || 'free';
  const used = tenant?.subscription?.repliesUsed || 0;
  const limit = tenant?.subscription?.replyLimit || 100;
  const resetDate = tenant?.subscription?.resetDate;
  const trialEnd = tenant?.subscription?.trialEndsAt;
  const isTrialing = trialEnd && new Date(trialEnd) > new Date();
  const pct = Math.min(100, Math.round((used / limit) * 100));

  const handleUpgrade = (planId) => {
    alert(`Razorpay integration — to activate:\n1. Add RAZORPAY_KEY_ID to .env\n2. Create subscription plan "${planId}" in Razorpay dashboard\n3. See SETUP_GUIDE.md → Step 8 for full billing code\n\nThe billing route at /api/billing handles checkout + webhooks.`);
  };

  return (
    <div>
      <div className="flex-between page-header mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Billing & Plan</h1>
          <p className="text-muted mt-1 text-sm">Manage subscription, usage, and payments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {['plans', 'usage', 'razorpay', 'faq'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: activeTab === t ? '600' : '400',
            color: activeTab === t ? 'var(--primary)' : 'var(--text-2)',
            borderBottom: activeTab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px', transition: 'all 0.15s', textTransform: 'capitalize'
          }}>{t === 'razorpay' ? '💳 Razorpay Setup' : t}</button>
        ))}
      </div>

      {/* ── PLANS TAB ── */}
      {activeTab === 'plans' && (
        <>
          {/* Trial banner */}
          {isTrialing && (
            <div className="alert alert-info mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎉 <strong>14-day free trial</strong> — expires {new Date(trialEnd).toLocaleDateString('en-IN')}</span>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('razorpay')}>Activate billing →</button>
            </div>
          )}

          {/* Billing toggle */}
          <div className="flex-center gap-3 mb-6">
            <span className="text-muted text-sm">Monthly</span>
            <div style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: yearly ? 'var(--primary)' : 'var(--surface-3)', cursor: 'pointer', border: '1px solid var(--border)', transition: 'background 0.2s' }}
              onClick={() => setYearly(y => !y)}>
              <div style={{ position: 'absolute', top: 2, left: yearly ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
            <span className="text-muted text-sm">Yearly <span style={{ color: 'var(--success)', fontWeight: '600', fontSize: '11px' }}>Save 20%</span></span>
          </div>

          {/* Plan cards */}
          <div className="plans-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
            {PLANS.map(p => {
              const isCurrent = plan === p.id;
              const price = yearly ? p.yearlyPrice : p.price;
              return (
                <div key={p.id} className="card plan-card" style={{ position: 'relative', border: isCurrent ? `2px solid ${p.color}` : p.popular ? `1px solid ${p.color}44` : undefined }}>
                  {p.popular && !isCurrent && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: p.color, color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      MOST POPULAR
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: p.color, color: 'white', fontSize: '10px', fontWeight: '800', padding: '3px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      CURRENT PLAN
                    </div>
                  )}

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: p.color }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '26px', fontWeight: '800' }}>{price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}</span>
                      {price > 0 && <span className="text-faint text-sm">/mo{yearly ? ' billed yearly' : ''}</span>}
                    </div>
                    {yearly && price > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                        (₹{(p.price).toLocaleString('en-IN')}/mo monthly)
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div>💬 {p.replies === 999999 ? 'Unlimited' : `${p.replies.toLocaleString()}`} replies/mo</div>
                    <div>🛒 {p.orders === 999999 ? 'Unlimited' : `${p.orders.toLocaleString()}`} orders</div>
                    <div>👥 {p.team === 999 ? 'Unlimited' : `${p.team}`} team members</div>
                  </div>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
                    {p.features.map(f => (
                      <li key={f} style={{ fontSize: '12px', color: 'var(--text-2)', display: 'flex', gap: '6px' }}>
                        <span style={{ color: p.color, flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                    {p.missing.map(f => (
                      <li key={f} style={{ fontSize: '12px', color: 'var(--text-3)', display: 'flex', gap: '6px' }}>
                        <span style={{ flexShrink: 0 }}>✗</span>{f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button className="btn btn-secondary btn-sm btn-full" disabled>Current plan</button>
                  ) : (
                    <button className="btn btn-sm btn-full" style={{ background: p.color, color: 'white' }} onClick={() => handleUpgrade(p.id)}>
                      {p.price === 0 ? 'Downgrade' : PLANS.findIndex(x => x.id === p.id) > PLANS.findIndex(x => x.id === plan) ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Payment methods */}
          <div className="card mb-5">
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Accepted Payment Methods</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['UPI (GPay, PhonePe, Paytm)', 'Credit / Debit Card', 'Net Banking', 'EMI (3-24 months)', 'Wallets'].map(m => (
                <div key={m} style={{ padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-2)' }}>
                  {m}
                </div>
              ))}
            </div>
            <p className="text-faint text-xs mt-3">Powered by Razorpay · PCI-DSS compliant · 2% transaction fee applies</p>
          </div>
        </>
      )}

      {/* ── USAGE TAB ── */}
      {activeTab === 'usage' && (
        <div style={{ maxWidth: '600px' }}>
          <div className="card mb-4">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Current Month Usage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'AI Replies', used, limit, color: pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--primary)' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex-between mb-2">
                    <span className="text-sm" style={{ fontWeight: '500' }}>{item.label}</span>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{item.used} <span className="text-faint text-sm">/ {item.limit === 999999 ? '∞' : item.limit}</span></span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (item.used / item.limit) * 100)}%`, background: item.color, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <div className="flex-between mt-2">
                    <span className="text-faint text-xs">{Math.round((item.used / item.limit) * 100)}% used</span>
                    <span className="text-faint text-xs">Resets {resetDate ? new Date(resetDate).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
            {pct > 80 && (
              <div className="alert alert-warning mt-4" style={{ fontSize: '13px' }}>
                ⚠️ You're using {pct}% of your quota. <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('plans')} style={{ color: 'var(--warning)', padding: '2px 6px' }}>Upgrade now →</button>
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Plan Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['Current Plan', <span style={{ textTransform: 'capitalize', fontWeight: '600', color: PLANS.find(p2 => p2.id === plan)?.color }}>{plan}</span>],
                ['Billing Cycle', 'Monthly'],
                ['Next Billing Date', resetDate ? new Date(resetDate).toLocaleDateString('en-IN') : '—'],
                ['Trial Status', isTrialing ? <span style={{ color: 'var(--info)', fontWeight: '600' }}>Active until {new Date(trialEnd).toLocaleDateString('en-IN')}</span> : 'Ended'],
              ].map(([label, value], i) => (
                <div key={i} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="text-muted">{label}</span>
                  <span style={{ fontWeight: '500' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RAZORPAY SETUP TAB ── */}
      {activeTab === 'razorpay' && (
        <div style={{ maxWidth: '700px' }}>
          <div className="alert alert-info mb-5">
            💳 <strong>Razorpay</strong> is India's leading payment gateway. Setting it up takes about 20 minutes. You need a bank account for payouts.
          </div>

          {/* Setup steps */}
          <div className="card mb-5">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '18px' }}>Setup Steps</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {RAZORPAY_STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', paddingBottom: i < RAZORPAY_STEPS.length - 1 ? '20px' : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>{s.step}</div>
                    {i < RAZORPAY_STEPS.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--border)', marginTop: '6px', minHeight: '20px' }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: '4px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{s.title}</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Env vars needed */}
          <div className="card mb-5">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Environment Variables to Add</h3>
            <div style={{ background: 'var(--surface-3)', borderRadius: '8px', padding: '14px', fontFamily: 'monospace', fontSize: '12px', lineHeight: 2 }}>
              <div><span style={{ color: 'var(--text-3)' }}># Add these to Railway environment variables:</span></div>
              <div><span style={{ color: 'var(--primary-l)' }}>RAZORPAY_KEY_ID</span>=<span style={{ color: 'var(--success)' }}>rzp_live_xxxxxxxxxx</span></div>
              <div><span style={{ color: 'var(--primary-l)' }}>RAZORPAY_KEY_SECRET</span>=<span style={{ color: 'var(--success)' }}>xxxxxxxxxxxxxxxx</span></div>
              <div><span style={{ color: 'var(--primary-l)' }}>RAZORPAY_WEBHOOK_SECRET</span>=<span style={{ color: 'var(--success)' }}>your_webhook_secret</span></div>
              <div style={{ marginTop: '8px' }}><span style={{ color: 'var(--text-3)' }}># For frontend (Vercel):</span></div>
              <div><span style={{ color: 'var(--primary-l)' }}>NEXT_PUBLIC_RAZORPAY_KEY_ID</span>=<span style={{ color: 'var(--success)' }}>rzp_live_xxxxxxxxxx</span></div>
            </div>
          </div>

          {/* Subscription plan IDs */}
          <div className="card mb-5">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Create Razorpay Subscription Plans</h3>
            <p className="text-muted text-sm mb-4">In Razorpay Dashboard → Products → Subscriptions → Plans → Create Plan for each tier:</p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Plan</th><th>Amount</th><th>Period</th><th>Plan Name (suggestion)</th></tr></thead>
                <tbody>
                  {[
                    { name: 'Starter', amount: '₹999', period: 'Monthly', rzpName: 'repliai_starter_monthly' },
                    { name: 'Growth', amount: '₹2,499', period: 'Monthly', rzpName: 'repliai_growth_monthly' },
                    { name: 'Pro', amount: '₹4,999', period: 'Monthly', rzpName: 'repliai_pro_monthly' },
                    { name: 'Starter (yearly)', amount: '₹9,588 (₹799×12)', period: 'Yearly', rzpName: 'repliai_starter_yearly' },
                    { name: 'Growth (yearly)', amount: '₹23,988', period: 'Yearly', rzpName: 'repliai_growth_yearly' },
                    { name: 'Pro (yearly)', amount: '₹47,988', period: 'Yearly', rzpName: 'repliai_pro_yearly' },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '600' }}>{r.name}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>{r.amount}</td>
                      <td className="text-muted">{r.period}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--primary-l)' }}>{r.rzpName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Webhook events */}
          <div className="card mb-5">
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '14px' }}>Webhook Events to Subscribe</h3>
            <p className="text-muted text-sm mb-3">In Razorpay Dashboard → Settings → Webhooks, subscribe to these events:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { event: 'subscription.activated', action: 'Upgrade tenant plan, activate features' },
                { event: 'subscription.charged', action: 'Confirm payment, reset monthly quota' },
                { event: 'subscription.halted', action: 'Downgrade to Free after failed payment' },
                { event: 'subscription.cancelled', action: 'Schedule downgrade at period end' },
                { event: 'payment.failed', action: 'Notify tenant via email, show warning in dashboard' },
              ].map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px', alignItems: 'flex-start' }}>
                  <code style={{ fontSize: '11px', color: 'var(--primary-l)', background: 'var(--surface-3)', padding: '2px 7px', borderRadius: '4px', flexShrink: 0, marginTop: '1px' }}>{w.event}</code>
                  <span className="text-muted text-sm">{w.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Backend billing route hint */}
          <div className="alert alert-info" style={{ fontSize: '13px' }}>
            📁 The billing route lives at <code style={{ background: 'rgba(56,189,248,0.1)', padding: '1px 5px', borderRadius: '3px', fontSize: '12px' }}>backend/src/routes/billing.js</code>. It handles checkout session creation, webhook verification (HMAC-SHA256), and plan upgrades/downgrades. See <strong>SETUP_GUIDE.md → Step 8</strong> for the complete billing route code.
          </div>
        </div>
      )}

      {/* ── FAQ TAB ── */}
      {activeTab === 'faq' && (
        <div style={{ maxWidth: '660px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FAQ.map((f, i) => (
              <details key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                <summary style={{ padding: '14px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {f.q}
                  <span style={{ color: 'var(--text-3)', fontSize: '18px', fontWeight: '400', flexShrink: 0, marginLeft: '12px' }}>+</span>
                </summary>
                <div style={{ padding: '0 18px 16px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, borderTop: '1px solid var(--border)' }}>
                  <div style={{ paddingTop: '12px' }}>{f.a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
