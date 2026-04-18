// ================================================================
// src/app/dashboard/ads/leads/page.js
// ================================================================
'use client';
import { useState, useEffect } from 'react';
import API from '../../../../lib/api';

const STATUS_COLORS = { new:'badge-yellow', contacted:'badge-blue', qualified:'badge-purple', ordered:'badge-green', lost:'badge-red' };

export default function AdLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 30 });
    if (status) p.set('status', status);
    API.get(`/api/ads/leads?${p}`).then(r => {
      setLeads(r.data.leads || []);
      setTotal(r.data.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);

  const updateStatus = async (id, newStatus) => {
    await API.patch(`/api/ads/leads/${id}/status`, { status: newStatus });
    load();
  };

  const countByStatus = (s) => leads.filter(l => l.status === s).length;

  return (
    <div>
      <div className="flex-between page-header mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Ad Leads</h1>
          <p className="text-muted mt-1 text-sm">{total} leads from Instagram & Facebook ads</p>
        </div>
        <div className="flex gap-2">
          {['', 'new', 'contacted', 'qualified', 'ordered', 'lost'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }} className="btn btn-sm"
              style={{ background: status === s ? 'var(--primary)' : 'var(--surface-3)', color: status === s ? 'white' : 'var(--text-2)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {['new','contacted','qualified','ordered','lost'].map(s => {
          const colors = { new:'#F59E0B', contacted:'#38BDF8', qualified:'#7C5CFF', ordered:'#22C55E', lost:'#EF4444' };
          return (
            <div key={s} className="card card-sm" style={{ cursor: 'pointer', border: status === s ? `1px solid ${colors[s]}` : '1px solid var(--border)' }} onClick={() => setStatus(status === s ? '' : s)}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: colors[s] }}>{leads.filter(l => l.status === s).length}</div>
              <div className="text-faint text-xs mt-1" style={{ textTransform: 'capitalize' }}>{s}</div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Lead</th><th>Ad Source</th><th>Contacted</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto', width: 24, height: 24 }} /></td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
                  <p>No leads yet. Create a campaign and connect your Meta Lead Ads webhook.</p>
                </td></tr>
              ) : leads.map(l => (
                <tr key={l._id}>
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{l.name || 'Unknown'}</div>
                    <div className="text-faint text-xs">{l.phone || l.email || '—'}</div>
                    {l.city && <div className="text-faint text-xs">{l.city}</div>}
                  </td>
                  <td>
                    <div className="text-sm">{l.campaignId?.name || l.adName || 'Unknown ad'}</div>
                    <div style={{ fontSize: '12px', color: l.platform === 'instagram' ? 'var(--ig)' : '#1877F2', fontWeight: '600' }}>
                      {l.platform === 'instagram' ? '📸 Instagram' : '📘 Facebook'}
                    </div>
                  </td>
                  <td>
                    {l.aiContactedAt ? (
                      <div>
                        <div className="badge badge-green text-xs">AI contacted</div>
                        <div className="text-faint text-xs mt-1">{new Date(l.aiContactedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                      </div>
                    ) : <span className="badge badge-gray text-xs">Pending</span>}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[l.status]} text-xs`} style={{ textTransform: 'capitalize' }}>{l.status}</span>
                  </td>
                  <td className="text-faint text-xs">{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <select className="select" value={l.status} onChange={e => updateStatus(l._id, e.target.value)} style={{ width: '120px', fontSize: '11px', padding: '4px 6px' }}>
                      {['new','contacted','qualified','ordered','lost'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 30 && (
        <div className="flex-center gap-3 mt-4">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-muted text-sm">Page {page} of {Math.ceil(total / 30)}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
