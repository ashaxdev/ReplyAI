'use client';
import { useAuth } from '../../../lib/AuthContext';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, replies: 100, features: ['1 platform', '100 AI replies/month', 'Basic analytics', 'Community support'] },
  { id: 'starter', name: 'Starter', price: 999, replies: 500, features: ['2 platforms', '500 AI replies/month', 'Lead capture', 'Email support', 'Team: 2 members'] },
  { id: 'growth', name: 'Growth', price: 2499, replies: 2000, features: ['2 platforms', '2,000 AI replies/month', 'Advanced analytics', 'Priority support', 'Team: 5 members', 'Bulk stock updates'] },
  { id: 'pro', name: 'Pro', price: 4999, replies: Infinity, features: ['2 platforms', 'Unlimited AI replies', 'Full analytics', 'Dedicated support', 'Unlimited team', 'All features', 'Custom AI instructions'] },
];

const PLAN_COLORS = { free: '#666680', starter: '#F59E0B', growth: '#38BDF8', pro: '#7C5CFF' };

export default function BillingPage() {
  const { tenant } = useAuth();
  const currentPlan = tenant?.subscription?.plan || 'free';
  const repliesUsed = tenant?.subscription?.repliesUsed || 0;
  const replyLimit = tenant?.subscription?.replyLimit || 100;
  const resetDate = tenant?.subscription?.resetDate;
  const trialEnd = tenant?.subscription?.trialEndsAt;

  const quotaPct = Math.min(100, Math.round((repliesUsed / replyLimit) * 100));

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Billing & Plan</h1>
        <p className="text-muted mt-1 text-sm">Manage your subscription and usage</p>
      </div>

      {/* Current usage */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Current Usage</h2>
          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: `${PLAN_COLORS[currentPlan]}18`, color: PLAN_COLORS[currentPlan], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {currentPlan} plan
          </span>
        </div>

        {trialEnd && new Date(trialEnd) > new Date() && (
          <div className="alert alert-info" style={{ marginBottom: '14px' }}>
            🎉 <strong>Free trial active</strong> — expires {new Date(trialEnd).toLocaleDateString('en-IN')}. Upgrade before it ends to keep AI running.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <div className="text-faint text-xs" style={{ marginBottom: '4px' }}>AI Replies This Month</div>
            <div style={{ fontSize: '24px', fontWeight: '700' }}>{repliesUsed}<span className="text-faint" style={{ fontSize: '14px', fontWeight: '400' }}> / {replyLimit === Infinity ? '∞' : replyLimit}</span></div>
            <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, marginTop: '8px' }}>
              <div style={{ height: '100%', width: `${quotaPct}%`, background: quotaPct > 90 ? 'var(--danger)' : quotaPct > 70 ? 'var(--warning)' : 'var(--primary)', borderRadius: 3 }} />
            </div>
          </div>
          <div>
            <div className="text-faint text-xs" style={{ marginBottom: '4px' }}>Quota Resets On</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{resetDate ? new Date(resetDate).toLocaleDateString('en-IN') : '—'}</div>
          </div>
          <div>
            <div className="text-faint text-xs" style={{ marginBottom: '4px' }}>Platforms Connected</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>{tenant?.platforms?.filter(p => p.isConnected).length || 0} / 2</div>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className="card" style={{ border: isCurrent ? `2px solid ${PLAN_COLORS[plan.id]}` : undefined, position: 'relative' }}>
              {isCurrent && (
                <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: PLAN_COLORS[plan.id], color: 'white', fontSize: '10px', fontWeight: '700', padding: '2px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  CURRENT PLAN
                </div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: PLAN_COLORS[plan.id] }}>{plan.name}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px' }}>
                  {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
                  {plan.price > 0 && <span className="text-faint" style={{ fontSize: '12px', fontWeight: '400' }}>/mo</span>}
                </div>
                <div className="text-faint text-xs" style={{ marginTop: '3px' }}>
                  {plan.replies === Infinity ? 'Unlimited replies' : `${plan.replies} replies/month`}
                </div>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: '12px', color: 'var(--text-2)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ color: PLAN_COLORS[plan.id], flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button className="btn btn-primary btn-sm" style={{ width: '100%', background: PLAN_COLORS[plan.id] }}
                  onClick={() => alert('Razorpay integration — see SETUP_GUIDE.md for billing setup instructions.')}>
                  {currentPlan === 'free' || (PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan)) ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
              {isCurrent && plan.price > 0 && (
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}
                  onClick={() => alert('Contact support to cancel your subscription.')}>
                  Manage
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="alert alert-info" style={{ fontSize: '13px' }}>
        💳 <strong>Payment via Razorpay</strong> — UPI, Net Banking, Credit/Debit cards accepted. All plans include a 14-day free trial. Cancel anytime. To set up Razorpay billing, see the <strong>SETUP_GUIDE.md</strong> → Step 8.
      </div>
    </div>
  );
}
