'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';
import API from '../../../lib/api';

const STATUS_COLOR = { draft:'badge-gray', pending_review:'badge-yellow', active:'badge-green', paused:'badge-blue', completed:'badge-gray', rejected:'badge-red' };
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ fontWeight: '600', marginBottom: '4px' }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function AdsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      API.get(`/api/ads/analytics?period=${period}`),
      API.get('/api/ads/campaigns?limit=5'),
    ]).then(([a, c]) => {
      setAnalytics(a.data);
      setCampaigns(c.data.campaigns || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period]);

  const ov = analytics?.overview || {};
  const fmt = v => `₹${(v || 0).toLocaleString('en-IN')}`;

  return (
    <div>
      {/* Header */}
      <div className="flex-between page-header mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Instagram Ads</h1>
          <p className="text-muted mt-1 text-sm">AI-powered ad management — create, analyse, convert</p>
        </div>
        <div className="flex gap-2">
          {['7d','30d','90d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="btn btn-sm"
              style={{ background: period === p ? 'var(--primary)' : 'var(--surface-3)', color: period === p ? 'white' : 'var(--text-2)', border: '1px solid var(--border)' }}>
              {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
          <Link href="/dashboard/ads/create" className="btn btn-primary">+ New Campaign</Link>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="stat-grid grid-4 mb-6">
            {[
              { label: 'Total Ad Spend', value: fmt(ov.totalSpend), icon: '💸', color: '#EF4444', sub: `${period} period` },
              { label: 'Leads Generated', value: (ov.totalLeads || 0).toLocaleString(), icon: '🎯', color: '#F59E0B', sub: `CPL: ${fmt(ov.avgCpl)}` },
              { label: 'Conversions', value: (ov.totalConversions || 0).toLocaleString(), icon: '✅', color: '#22C55E', sub: `${ov.convRate}% conv. rate` },
              { label: 'Ad Revenue', value: fmt(ov.totalRevenue), icon: '💰', color: '#7C5CFF', sub: `ROAS: ${(ov.avgRoas || 0).toFixed(1)}x` },
            ].map((s, i) => (
              <div key={i} className="card stat-card flex gap-3 items-center fade-in">
                <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div className="stat-value" style={{ fontSize: '22px', fontWeight: '700' }}>{s.value}</div>
                  <div className="text-muted text-sm">{s.label}</div>
                  <div className="text-faint text-xs">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-2 mb-6" style={{ gap: '20px' }}>
            {/* Daily leads chart */}
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Daily Leads & Conversions</h3>
              {analytics?.dailyLeads?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={analytics.dailyLeads}>
                    <defs>
                      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#F59E0B" fill="url(#lg)" strokeWidth={2} />
                    <Area type="monotone" dataKey="converted" name="Converted" stroke="#22C55E" fill="url(#cg)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="flex-center" style={{ height: 180, color: 'var(--text-3)', fontSize: '13px' }}>No lead data yet</div>}
            </div>

            {/* Lead funnel */}
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Lead Funnel</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'New Leads', key: 'new', color: '#F59E0B' },
                  { label: 'Contacted by AI', key: 'contacted', color: '#38BDF8' },
                  { label: 'Qualified', key: 'qualified', color: '#7C5CFF' },
                  { label: 'Converted to Order', key: 'ordered', color: '#22C55E' },
                  { label: 'Lost', key: 'lost', color: '#EF4444' },
                ].map(f => {
                  const item = analytics?.leadFunnel?.find(l => l._id === f.key);
                  const count = item?.count || 0;
                  const maxCount = Math.max(...(analytics?.leadFunnel || []).map(l => l.count), 1);
                  return (
                    <div key={f.key}>
                      <div className="flex-between mb-1">
                        <span className="text-sm">{f.label}</span>
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{count}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: f.color, borderRadius: 3, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top campaigns */}
          <div className="card mb-6" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="flex-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Campaigns</h3>
              <Link href="/dashboard/ads/campaigns" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Campaign</th><th>Status</th><th>Spend</th><th>Leads</th><th>Orders</th><th>ROAS</th><th>CPL</th><th>Action</th></tr></thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📢</div>
                      <p>No campaigns yet. <Link href="/dashboard/ads/create" style={{ color: 'var(--primary)' }}>Create your first ad →</Link></p>
                    </td></tr>
                  ) : campaigns.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.name}</div>
                        <div className="text-faint text-xs">{c.objective?.replace('_', ' ')}</div>
                      </td>
                      <td><span className={`badge ${STATUS_COLOR[c.status]} text-xs`} style={{ textTransform: 'capitalize' }}>{c.status}</span></td>
                      <td style={{ fontWeight: '600' }}>{fmt(c.metrics?.spend)}</td>
                      <td>{c.metrics?.leads || 0}</td>
                      <td style={{ color: 'var(--success)', fontWeight: '600' }}>{c.metrics?.conversions || 0}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: (c.metrics?.roas || 0) >= 2 ? 'var(--success)' : (c.metrics?.roas || 0) >= 1 ? 'var(--warning)' : 'var(--danger)' }}>
                          {(c.metrics?.roas || 0).toFixed(1)}x
                        </span>
                      </td>
                      <td className="text-muted">{fmt(c.metrics?.cpl)}</td>
                      <td>
                        <Link href={`/dashboard/ads/campaigns/${c._id}`} className="btn btn-ghost btn-sm">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid-3" style={{ gap: '16px' }}>
            {[
              { icon: '🎯', title: 'Generate Targeting', desc: 'AI analyses your customers and builds the perfect audience brief', href: '/dashboard/ads/create?step=targeting', color: '#7C5CFF' },
              { icon: '✍️', title: 'Write Ad Copy', desc: 'AI generates 3 high-converting copy variants for any product', href: '/dashboard/ads/create?step=copy', color: '#F59E0B' },
              { icon: '👥', title: 'Build Lookalike Audience', desc: 'Export your customer data for Meta to find similar buyers', href: '/dashboard/ads/analytics?tab=lookalike', color: '#22C55E' },
            ].map((a, i) => (
              <Link key={i} href={a.href} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'border 0.15s', border: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>{a.icon}</div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{a.title}</div>
                  <p className="text-muted text-sm">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
