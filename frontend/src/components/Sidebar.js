'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// import { useAuth } from '../../lib/AuthContext';
import { useAuth } from '../lib/AuthContext';

const NAV = [
  { href: '/dashboard',               icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/products',      icon: '📦', label: 'Products / Catalogue' },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversations' },
  { href: '/dashboard/leads',         icon: '🎯', label: 'Leads & Orders' },
  { href: '/dashboard/analytics',     icon: '📈', label: 'Analytics' },
  { href: '/dashboard/connect',       icon: '🔗', label: 'Connect Platforms' },
  { href: '/dashboard/team',          icon: '👥', label: 'Team' },
  { href: '/dashboard/settings',      icon: '⚙️', label: 'Settings & AI' },
  { href: '/dashboard/audit',         icon: '🔐', label: 'Audit Log' },
  { href: '/dashboard/billing',       icon: '💳', label: 'Billing & Plan' },
];

const PLAN_COLORS = {
  free: '#666680', starter: '#F59E0B', growth: '#38BDF8', pro: '#7C5CFF', enterprise: '#22C55E'
};

export default function Sidebar() {
  const pathname = usePathname();
  const { tenant, logout } = useAuth();

  const planColor = PLAN_COLORS[tenant?.subscription?.plan] || PLAN_COLORS.free;
  const quotaPct = tenant ? Math.min(100, Math.round((tenant.subscription?.repliesUsed / tenant.subscription?.replyLimit) * 100)) : 0;

  return (
    <aside style={{
      width: '240px', minHeight: '100vh',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '0', position: 'fixed', top: 0, left: 0, bottom: 0,
      zIndex: 100, overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(135deg, #7C5CFF, #9B7FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚡ ReplyAI ERP</div>
        <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant?.businessName}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px', textTransform: 'capitalize' }}>{tenant?.businessType?.replace('_', ' ')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '9px',
              padding: '9px 10px', borderRadius: '8px', textDecoration: 'none',
              fontSize: '13px', fontWeight: active ? '600' : '400',
              color: active ? '#fff' : 'var(--text-2)',
              background: active ? 'var(--primary)' : 'transparent',
              marginBottom: '2px', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; } }}
            >
              <span style={{ fontSize: '15px', flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quota + Plan */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>AI Replies</span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: planColor, textTransform: 'uppercase' }}>{tenant?.subscription?.plan}</span>
          </div>
          <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${quotaPct}%`, background: quotaPct > 90 ? 'var(--danger)' : quotaPct > 70 ? 'var(--warning)' : 'var(--primary)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>
            {tenant?.subscription?.repliesUsed || 0} / {tenant?.subscription?.replyLimit || 100} used
          </div>
        </div>

        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
          padding: '8px 10px', borderRadius: '8px', background: 'transparent',
          border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px',
          transition: 'all 0.15s'
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--danger)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <span>🚪</span><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
