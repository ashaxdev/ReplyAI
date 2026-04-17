'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

function StatCard({ icon, label, value, sub, color = 'var(--primary)', trend }) {
  return (
    <div className="card fade-in" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '22px', fontWeight: '700', lineHeight: 1.2 }}>{value ?? <span className="text-faint">—</span>}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function PlatformBadge({ platform, connected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <span style={{ fontSize: '22px' }}>{platform === 'whatsapp' ? '💬' : '📸'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{platform}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{platform === 'whatsapp' ? 'Business API' : 'DM Automation'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div className="pulse-dot" style={{ background: connected ? 'var(--success)' : 'var(--text-3)' }} />
        <span style={{ fontSize: '11px', color: connected ? 'var(--success)' : 'var(--text-3)', fontWeight: '600' }}>{connected ? 'Active' : 'Not connected'}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { tenant } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/api/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const quota = stats?.quota;
  const quotaPct = quota ? Math.round((quota.used / quota.limit) * 100) : 0;
  const waConn = stats?.platforms?.find(p => p.platform === 'whatsapp');
  const igConn = stats?.platforms?.find(p => p.platform === 'instagram');

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {tenant?.ownerName?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-2)', marginTop: '4px', fontSize: '14px' }}>
          {tenant?.businessName} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <StatCard icon="📦" label="Total Products" value={stats?.products?.total} sub={`${stats?.products?.available || 0} available`} color="#7C5CFF" />
            <StatCard icon="💬" label="Conversations" value={stats?.conversations?.total} sub={`${stats?.conversations?.open || 0} open`} color="#25D366" />
            <StatCard icon="🤖" label="AI Replies Used" value={quota?.used} sub={`${quotaPct}% of ${quota?.limit} quota`} color="#38BDF8" />
            <StatCard icon="🎯" label="Orders Captured" value={stats?.conversations?.ordered} sub="via AI chat" color="#F59E0B" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
            {/* Activity Chart */}
            <div className="card">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Conversation Activity (30 days)</h2>
              </div>
              {stats?.activityChart?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.activityChart}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="count" stroke="#7C5CFF" fill="url(#grad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '32px' }}>📊</span>
                  <p style={{ fontSize: '13px' }}>No activity yet. Connect a platform to start.</p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Platform status */}
              <div className="card">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Platform Status</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <PlatformBadge platform="whatsapp" connected={waConn?.isConnected} />
                  <PlatformBadge platform="instagram" connected={igConn?.isConnected} />
                </div>
                {(!waConn?.isConnected && !igConn?.isConnected) && (
                  <a href="/dashboard/connect" style={{ display: 'block', marginTop: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>+ Connect a platform →</a>
                )}
              </div>

              {/* Quota */}
              <div className="card">
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Monthly Quota</h3>
                <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>
                  {quota?.used || 0} <span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-2)' }}>/ {quota?.limit || 100}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, marginBottom: '8px' }}>
                  <div style={{ height: '100%', width: `${quotaPct}%`, background: quotaPct > 90 ? 'var(--danger)' : quotaPct > 70 ? 'var(--warning)' : 'var(--primary)', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Resets on {quota?.resetDate ? new Date(quota.resetDate).toLocaleDateString('en-IN') : '—'}</div>
                {quotaPct > 80 && (
                  <a href="/dashboard/billing" style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--warning)', textDecoration: 'none', fontWeight: '600' }}>⚠️ Upgrade plan →</a>
                )}
              </div>
            </div>
          </div>

          {/* Recent conversations */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Recent Conversations</h2>
              <a href="/dashboard/conversations" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}>View all →</a>
            </div>
            {!stats?.recentConversations?.length ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>💬</div>
                <p>No conversations yet. Connect WhatsApp or Instagram to start receiving messages.</p>
              </div>
            ) : (
              <div>
                {stats.recentConversations.map(c => (
                  <div key={c._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.platform === 'whatsapp' ? 'rgba(37,211,102,0.15)' : 'rgba(225,48,108,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                      {c.platform === 'whatsapp' ? '💬' : '📸'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.customerName || c.customerId}</div>
                      <div className="truncate" style={{ fontSize: '12px', color: 'var(--text-3)' }}>{c.lastMessage || 'No messages'}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <span className={`badge badge-${c.leadStatus === 'ordered' ? 'green' : c.leadStatus === 'interested' ? 'yellow' : 'gray'}`} style={{ fontSize: '10px' }}>{c.leadStatus}</span>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>{new Date(c.lastActivityAt).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
