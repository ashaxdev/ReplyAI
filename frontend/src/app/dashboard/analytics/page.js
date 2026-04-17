'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import API from '../../../lib/api';

const COLORS = ['#7C5CFF', '#25D366', '#38BDF8', '#F59E0B', '#EF4444'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [convStats, setConvStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/api/dashboard/stats'),
      API.get('/api/conversations/meta/stats'),
    ]).then(([s, c]) => {
      setStats(s.data);
      setConvStats(c.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-center" style={{ height: '200px' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  const platformData = [
    { name: 'WhatsApp', value: stats?.conversations?.whatsapp || 0 },
    { name: 'Instagram', value: stats?.conversations?.instagram || 0 },
  ];

  const leadData = convStats?.byLead?.map(l => ({ name: l._id, value: l.count })) || [];
  const statusData = convStats?.byStatus?.map(s => ({ name: s._id, value: s.count })) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
        <p style={{ fontWeight: '600', marginBottom: '4px' }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Analytics</h1>
        <p className="text-muted mt-1 text-sm">Performance overview of your AI messaging</p>
      </div>

      {/* Top stats */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Conversations', value: stats?.conversations?.total || 0, icon: '💬', color: '#7C5CFF' },
          { label: 'AI Replies Sent', value: stats?.messages?.ai_replies || 0, icon: '🤖', color: '#38BDF8' },
          { label: 'Orders Captured', value: stats?.conversations?.ordered || 0, icon: '🎯', color: '#22C55E' },
          { label: 'Products in Catalogue', value: stats?.products?.total || 0, icon: '📦', color: '#F59E0B' },
        ].map((s, i) => (
          <div key={i} className="card flex gap-3" style={{ alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: '20px', marginBottom: '20px' }}>
        {/* Activity chart */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Daily Conversations (30 days)</h3>
          {stats?.activityChart?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.activityChart}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Conversations" stroke="#7C5CFF" fill="url(#ag)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="flex-center" style={{ height: 180, color: 'var(--text-3)', fontSize: '13px' }}>No data yet</div>}
        </div>

        {/* Platform split */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Platform Split</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                  {platformData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {platformData.map((p, i) => (
                <div key={i} className="flex-between" style={{ marginBottom: '8px' }}>
                  <div className="flex gap-2" style={{ alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i] }} />
                    <span style={{ fontSize: '13px' }}>{p.name}</span>
                  </div>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '20px' }}>
        {/* Lead funnel */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Lead Pipeline</h3>
          {leadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leadData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--text-2)' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                  {leadData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex-center" style={{ height: 180, color: 'var(--text-3)', fontSize: '13px' }}>No lead data yet</div>}
        </div>

        {/* Quota usage */}
        <div className="card">
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Monthly Quota Usage</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'AI Replies Used', used: stats?.quota?.used || 0, total: stats?.quota?.limit || 100, color: '#7C5CFF' },
              { label: 'Products Available', used: stats?.products?.available || 0, total: stats?.products?.total || 1, color: '#22C55E' },
              { label: 'Conversations Resolved', used: statusData.find(s => s.name === 'resolved')?.value || 0, total: stats?.conversations?.total || 1, color: '#38BDF8' },
            ].map((item, i) => {
              const pct = Math.min(100, Math.round((item.used / item.total) * 100));
              return (
                <div key={i}>
                  <div className="flex-between text-sm" style={{ marginBottom: '5px' }}>
                    <span style={{ color: 'var(--text-2)' }}>{item.label}</span>
                    <span style={{ fontWeight: '600' }}>{item.used} / {item.total}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
