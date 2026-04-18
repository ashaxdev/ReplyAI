'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import API from '../../../lib/api';

const COLORS = ['#7C5CFF','#22C55E','#38BDF8','#F59E0B','#EF4444','#E1306C','#25D366'];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <p style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--text)' }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>
        {p.name}: {p.name === 'revenue' ? `₹${Number(p.value).toLocaleString('en-IN')}` : p.value}
      </p>)}
    </div>
  );
};

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get(`/api/orders/meta/analytics?period=${period}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

  if (loading) return <div className="flex-center" style={{ height: '200px' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  const ov = data?.overview || {};
  const convRate = ov.totalOrders && data?.totalLeads ? ((ov.totalOrders / data.totalLeads) * 100).toFixed(1) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex-between page-header mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Sales Reports</h1>
          <p className="text-muted mt-1 text-sm">Revenue tracked from AI-converted orders</p>
        </div>
        <div className="flex gap-2">
          {['7d','30d','90d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="btn btn-sm"
              style={{ background: period === p ? 'var(--primary)' : 'var(--surface-3)', color: period === p ? 'white' : 'var(--text-2)', border: '1px solid var(--border)' }}>
              {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid grid-4 mb-6">
        {[
          { label: 'Total Revenue', value: fmt(ov.totalRevenue), icon: '💰', color: '#22C55E', sub: `${ov.totalOrders || 0} orders` },
          { label: 'Avg Order Value', value: fmt(ov.avgOrderValue), icon: '📦', color: '#7C5CFF', sub: 'per order' },
          { label: 'Paid Revenue', value: fmt(ov.paidRevenue), icon: '✅', color: '#38BDF8', sub: 'payment confirmed' },
          { label: 'AI Captured', value: `${ov.aiCaptured || 0}`, icon: '🤖', color: '#F59E0B', sub: `of ${ov.totalOrders || 0} orders` },
        ].map((s, i) => (
          <div key={i} className="card stat-card fade-in flex gap-3 items-center">
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: '22px', fontWeight: '700' }}>{s.value}</div>
              <div className="text-muted text-sm">{s.label}</div>
              <div className="text-faint text-xs">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card mb-5">
        <div className="flex-between mb-4">
          <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Daily Revenue</h2>
          <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>Total: {fmt(ov.totalRevenue)}</div>
        </div>
        {data?.daily?.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#22C55E" fill="url(#rg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex-center" style={{ height: 200, color: 'var(--text-3)', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '32px' }}>📊</span>
            <p style={{ fontSize: '13px' }}>No revenue data yet. Orders will appear here once placed.</p>
          </div>
        )}
      </div>

      <div className="grid-2 mb-5" style={{ gap: '20px' }}>
        {/* Orders chart */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Daily Orders</h3>
          {data?.daily?.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.daily}>
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="orders" name="orders" fill="#7C5CFF" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex-center" style={{ height: 160, color: 'var(--text-3)', fontSize: '13px' }}>No data yet</div>}
        </div>

        {/* Top products */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Top Products by Revenue</h3>
          {data?.topProducts?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.topProducts.slice(0, 6).map((p, i) => {
                const maxRev = data.topProducts[0]?.totalRevenue || 1;
                const pct = (p.totalRevenue / maxRev) * 100;
                return (
                  <div key={i}>
                    <div className="flex-between text-sm mb-1">
                      <span className="truncate" style={{ maxWidth: '60%', fontWeight: i === 0 ? '600' : '400' }}>{p._id}</span>
                      <span style={{ fontWeight: '600', color: 'var(--success)' }}>₹{p.totalRevenue?.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 2 }} />
                    </div>
                    <div className="text-faint text-xs mt-1">{p.totalQty} units · {p.orderCount} orders</div>
                  </div>
                );
              })}
            </div>
          ) : <div className="flex-center" style={{ height: 160, color: 'var(--text-3)', fontSize: '13px' }}>No data yet</div>}
        </div>
      </div>

      {/* Order status breakdown */}
      <div className="grid-2 mb-5" style={{ gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Orders by Status</h3>
          {data?.byStatus?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.byStatus.map((s, i) => (
                <div key={i} className="flex-between" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                  <span className="text-sm" style={{ textTransform: 'capitalize', fontWeight: '500' }}>{s._id}</span>
                  <div className="flex gap-3 items-center">
                    <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>₹{s.value?.toLocaleString('en-IN')}</span>
                    <span className="badge badge-gray">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="flex-center" style={{ height: 120, color: 'var(--text-3)', fontSize: '13px' }}>No data</div>}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Orders by Platform</h3>
          {data?.byPlatform?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.byPlatform.map((p, i) => (
                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="flex gap-2 items-center">
                    <span style={{ fontSize: '18px' }}>{p._id === 'whatsapp' ? '💬' : p._id === 'instagram' ? '📸' : '✏️'}</span>
                    <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{p._id}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: 'var(--success)' }}>₹{p.revenue?.toLocaleString('en-IN')}</div>
                    <div className="text-faint text-xs">{p.count} orders</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="flex-center" style={{ height: 120, color: 'var(--text-3)', fontSize: '13px' }}>No data</div>}
        </div>
      </div>

      {/* Recent orders */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Recent Orders</h3>
          <a href="/dashboard/orders" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}>View all →</a>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {data?.recentOrders?.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>No orders yet</td></tr>
              ) : data?.recentOrders?.map(o => (
                <tr key={o._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>{o.orderNumber}</td>
                  <td style={{ fontWeight: '600', fontSize: '13px' }}>{o.customer?.name}</td>
                  <td style={{ fontWeight: '700', color: 'var(--success)' }}>₹{o.total?.toLocaleString('en-IN')}</td>
                  <td><span className="badge badge-yellow text-xs" style={{ textTransform: 'capitalize' }}>{o.status}</span></td>
                  <td className="text-faint text-xs">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
