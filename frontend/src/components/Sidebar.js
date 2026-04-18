'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';

const NAV = [
  { href: '/dashboard',               icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/orders',        icon: '🛒', label: 'Orders', badge: 'sales' },
  { href: '/dashboard/products',      icon: '📦', label: 'Products' },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversations' },
  { href: '/dashboard/leads',         icon: '🎯', label: 'Leads' },
  { href: '/dashboard/reports',       icon: '📈', label: 'Sales Reports' },
  { href: '/dashboard/connect',       icon: '🔗', label: 'Platforms' },
  { href: '/dashboard/ads',           icon: '📢', label: 'Instagram Ads', badge: 'new' },
  { href: '/dashboard/ads/leads',     icon: '🎯', label: 'Ad Leads' },
  { href: '/dashboard/ads/analytics', icon: '📊', label: 'Ad Analytics' },
  { href: '/dashboard/team',          icon: '👥', label: 'Team' },
  { href: '/dashboard/settings',      icon: '⚙️', label: 'Settings & AI' },
  { href: '/dashboard/audit',         icon: '🔐', label: 'Audit Log' },
  { href: '/dashboard/billing',       icon: '💳', label: 'Billing & Plan' },
];

const PLAN_COLOR = { free: '#666680', starter: '#F59E0B', growth: '#38BDF8', pro: '#7C5CFF', enterprise: '#22C55E' };

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { tenant, logout } = useAuth();

  const plan = tenant?.subscription?.plan || 'free';
  const used = tenant?.subscription?.repliesUsed || 0;
  const limit = tenant?.subscription?.replyLimit || 100;
  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <>
      {/* Overlay for mobile */}
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo + close */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '18px', fontWeight: '800', background: 'linear-gradient(135deg, #7C5CFF, #9B7FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ⚡ ReplyAI ERP
            </div>
            <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ display: 'none' }} id="sidebar-close">✕</button>
          </div>
          <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant?.businessName}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{tenant?.businessType?.replace('_', ' ')}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={onClose} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 10px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '13px', fontWeight: active ? '600' : '400',
                color: active ? '#fff' : 'var(--text-2)',
                background: active ? 'var(--primary)' : 'transparent',
                marginBottom: '1px', transition: 'all 0.12s',
              }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge === 'sales' && (
                  <span style={{ fontSize: '9px', fontWeight: '700', background: active ? 'rgba(255,255,255,0.25)' : 'rgba(34,197,94,0.2)', color: active ? 'white' : 'var(--success)', padding: '1px 6px', borderRadius: '10px' }}>SALES</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Plan + quota */}
        <div style={{ padding: '10px 10px', borderTop: '1px solid var(--border)' }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>AI Replies</span>
              <span style={{ fontSize: '10px', fontWeight: '700', color: PLAN_COLOR[plan], textTransform: 'uppercase' }}>{plan}</span>
            </div>
            <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 90 ? 'var(--danger)' : pct > 70 ? 'var(--warning)' : 'var(--primary)', borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{used}/{limit} used</div>
          </div>
          <button onClick={() => { logout(); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
            padding: '8px 10px', borderRadius: '8px', background: 'transparent',
            border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px',
          }}>
            <span>🚪</span><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Inject mobile close button visibility */}
      <style>{`
        @media (max-width: 768px) {
          #sidebar-close { display: flex !important; }
        }
      `}</style>
    </>
  );
}
