'use client';
// LEADS PAGE
import { useState, useEffect } from 'react';
import API from '../../../lib/api';

const STAGES = ['new', 'interested', 'qualified', 'ordered', 'completed', 'lost'];
const STAGE_COLOR = { new: '#666680', interested: '#F59E0B', qualified: '#38BDF8', ordered: '#7C5CFF', completed: '#22C55E', lost: '#EF4444' };

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/api/conversations?limit=100').then(r => {
      setLeads(r.data.conversations || []);
      setLoading(false);
    });
  }, []);

  const update = async (id, data) => {
    await API.patch(`/api/conversations/${id}`, data);
    setLeads(ls => ls.map(l => l._id === id ? { ...l, ...data } : l));
  };

  const filtered = filter === 'all' ? leads : leads.filter(l => l.leadStatus === filter);

  const countByStage = (stage) => leads.filter(l => l.leadStatus === stage).length;

  if (loading) return <div className="flex-center" style={{ height: '200px' }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>;

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Leads & Orders</h1>
          <p className="text-muted mt-1 text-sm">Customers captured by AI across all platforms</p>
        </div>
      </div>

      {/* Stage summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {STAGES.map(stage => (
          <div key={stage} className="card card-sm" style={{ cursor: 'pointer', border: filter === stage ? `1px solid ${STAGE_COLOR[stage]}` : undefined }}
            onClick={() => setFilter(filter === stage ? 'all' : stage)}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: STAGE_COLOR[stage] }}>{countByStage(stage)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'capitalize', marginTop: '2px' }}>{stage}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Platform</th>
              <th>Last Message</th>
              <th>Order Value</th>
              <th>Stage</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)' }}>No leads found</td></tr>
            ) : filtered.map(l => (
              <tr key={l._id}>
                <td>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{l.customerName || 'Unknown'}</div>
                  <div className="text-faint text-xs">{l.customerPhone || l.customerId?.substring(0, 15)}</div>
                </td>
                <td>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: l.platform === 'whatsapp' ? 'var(--wa)' : 'var(--ig)' }}>
                    {l.platform === 'whatsapp' ? '💬 WhatsApp' : '📸 Instagram'}
                  </span>
                </td>
                <td style={{ maxWidth: '180px' }}>
                  <p className="truncate text-muted text-sm">{l.lastMessage || '—'}</p>
                </td>
                <td>
                  {l.orderValue ? <span style={{ fontWeight: '600', color: 'var(--success)' }}>₹{l.orderValue}</span> : <span className="text-faint">—</span>}
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${STAGE_COLOR[l.leadStatus]}18`, color: STAGE_COLOR[l.leadStatus], textTransform: 'capitalize' }}>
                    {l.leadStatus}
                  </span>
                </td>
                <td className="text-faint text-xs">{new Date(l.lastActivityAt).toLocaleDateString('en-IN')}</td>
                <td>
                  <select className="select" value={l.leadStatus} onChange={e => update(l._id, { leadStatus: e.target.value })}
                    style={{ width: '120px', fontSize: '11px', padding: '4px 6px' }}>
                    {STAGES.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
