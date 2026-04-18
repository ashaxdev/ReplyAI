'use client';
import { useState, useEffect } from 'react';
import API from '../../../lib/api';

const STATUS_COLOR = { new:'badge-yellow', confirmed:'badge-blue', processing:'badge-purple', packed:'badge-purple', shipped:'badge-blue', delivered:'badge-green', cancelled:'badge-red', returned:'badge-red' };
const PAY_COLOR = { pending:'badge-yellow', paid:'badge-green', failed:'badge-red', refunded:'badge-gray' };
const STATUS_STEPS = ['new','confirmed','processing','packed','shipped','delivered'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) p.set('status', statusFilter);
      if (search) p.set('search', search);
      const r = await API.get(`/api/orders?${p}`);
      setOrders(r.data.orders);
      setTotal(r.data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const openDetail = (order) => { setSelected(order); setShowDetail(true); };

  const updateStatus = async (id, status) => {
    setUpdatingStatus(true);
    try {
      const r = await API.patch(`/api/orders/${id}/status`, { status });
      setSelected(r.data);
      load();
    } catch (e) { alert('Update failed'); }
    setUpdatingStatus(false);
  };

  const updatePayment = async (id, paymentStatus) => {
    try {
      const r = await API.patch(`/api/orders/${id}/payment`, { paymentStatus });
      setSelected(r.data);
      load();
    } catch (e) { alert('Update failed'); }
  };

  const exportCSV = () => window.open('/api/orders/meta/export', '_blank');

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(); };

  return (
    <div>
      {/* Header */}
      <div className="flex-between page-header mb-6">
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Orders</h1>
          <p className="text-muted mt-1 text-sm">{total} total · AI-captured and manual orders</p>
        </div>
        <div className="flex gap-2 btn-group">
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setSelected(null); setShowDetail(true); }}>+ New Order</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2" style={{ flex: 1, minWidth: '200px' }}>
          <input className="input" placeholder="Search by name, phone, order #..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ maxWidth: '300px' }} />
          <button className="btn btn-secondary" type="submit">Search</button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {['', 'new', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className="btn btn-sm"
              style={{ background: statusFilter === s ? 'var(--primary)' : 'var(--surface-3)', color: statusFilter === s ? 'white' : 'var(--text-2)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Source</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto', width: 24, height: 24 }} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛒</div>
                  <p>No orders yet. Orders captured by AI will appear here.</p>
                </td></tr>
              ) : orders.map(o => (
                <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(o)}>
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '12px', fontFamily: 'monospace', color: 'var(--primary)' }}>{o.orderNumber}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', fontSize: '13px' }}>{o.customer?.name}</div>
                    <div className="text-faint text-xs">{o.customer?.phone || '—'}</div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-2)', maxWidth: '160px' }}>
                    <div className="truncate">{o.items?.map(i => `${i.productName} ×${i.quantity}`).join(', ')}</div>
                    <div className="text-faint text-xs">{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</div>
                  </td>
                  <td style={{ fontWeight: '700', fontSize: '14px', color: 'var(--success)' }}>₹{o.total?.toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${PAY_COLOR[o.paymentStatus]}`} style={{ textTransform: 'capitalize' }}>{o.paymentStatus}</span></td>
                  <td><span className={`badge ${STATUS_COLOR[o.status]}`} style={{ textTransform: 'capitalize' }}>{o.status}</span></td>
                  <td>
                    <div className="flex gap-1 items-center">
                      <span style={{ fontSize: '13px' }}>{o.platform === 'whatsapp' ? '💬' : o.platform === 'instagram' ? '📸' : '✏️'}</span>
                      {o.capturedByAi && <span className="badge badge-purple text-xs">AI</span>}
                    </div>
                  </td>
                  <td className="text-faint text-xs">{new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openDetail(o); }}>→</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex-center gap-3 mt-4">
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-muted text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetail(false)}>
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div className="flex-between mb-4">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{selected?.orderNumber || 'New Order'}</h2>
                {selected?.capturedByAi && <span className="badge badge-purple text-xs mt-1">🤖 AI Captured</span>}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(false)}>✕</button>
            </div>

            {selected && (
              <>
                {/* Progress steps */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {STATUS_STEPS.map((s, i) => {
                    const idx = STATUS_STEPS.indexOf(selected.status);
                    const done = i <= idx;
                    return (
                      <div key={s} style={{ flex: 1, minWidth: '60px', textAlign: 'center' }}>
                        <div style={{ height: 4, background: done ? 'var(--primary)' : 'var(--border)', borderRadius: 2, marginBottom: '4px' }} />
                        <div style={{ fontSize: '10px', color: done ? 'var(--primary)' : 'var(--text-3)', textTransform: 'capitalize', fontWeight: done ? '600' : '400' }}>{s}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Customer */}
                <div className="card card-sm mb-3">
                  <div className="text-faint text-xs mb-2">CUSTOMER</div>
                  <div style={{ fontWeight: '600' }}>{selected.customer?.name}</div>
                  <div className="text-muted text-sm">{selected.customer?.phone}</div>
                  {selected.customer?.address?.line1 && <div className="text-muted text-sm">{selected.customer.address.line1}</div>}
                </div>

                {/* Items */}
                <div className="card card-sm mb-3">
                  <div className="text-faint text-xs mb-2">ORDER ITEMS</div>
                  {selected.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < selected.items.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                      <div>
                        <span style={{ fontWeight: '600' }}>{item.productName}</span>
                        {item.variant && <span className="text-faint"> · {item.variant}</span>}
                        <span className="text-muted"> ×{item.quantity}</span>
                      </div>
                      <span style={{ fontWeight: '600' }}>₹{item.totalPrice?.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontWeight: '700', fontSize: '15px' }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--success)' }}>₹{selected.total?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid-2">
                  <div>
                    <label className="label">Update Status</label>
                    <select className="select" value={selected.status} onChange={e => updateStatus(selected._id, e.target.value)} disabled={updatingStatus}>
                      {['new','confirmed','processing','packed','shipped','delivered','cancelled','returned'].map(s => (
                        <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Status</label>
                    <select className="select" value={selected.paymentStatus} onChange={e => updatePayment(selected._id, e.target.value)}>
                      {['pending','paid','failed','refunded'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
