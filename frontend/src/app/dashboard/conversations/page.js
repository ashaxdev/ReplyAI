'use client';
import { useState, useEffect, useRef } from 'react';
import API from '../../../lib/api';

const LEAD_COLORS = { new: 'badge-gray', interested: 'badge-yellow', qualified: 'badge-blue', ordered: 'badge-green', completed: 'badge-green', lost: 'badge-red' };
const STATUS_COLORS = { open: 'badge-yellow', pending: 'badge-blue', resolved: 'badge-green', spam: 'badge-red' };

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const msgEndRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 40 });
    if (platform) params.set('platform', platform);
    if (status) params.set('status', status);
    const r = await API.get(`/api/conversations?${params}`);
    setConversations(r.data.conversations);
    setTotal(r.data.total);
    setLoading(false);
  };

  useEffect(() => { load(); }, [platform, status]);

  useEffect(() => {
    if (!selected) return;
    API.get(`/api/conversations/${selected._id}`).then(r => {
      setMessages(r.data.messages || []);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }, [selected]);

  const updateConversation = async (id, data) => {
    await API.patch(`/api/conversations/${id}`, data);
    load();
    if (selected?._id === id) setSelected(s => ({ ...s, ...data }));
  };

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Conversations</h1>
          <p className="text-muted mt-1 text-sm">{total} total conversations</p>
        </div>
        <div className="flex gap-2">
          {['', 'whatsapp', 'instagram'].map(p => (
            <button key={p} onClick={() => setPlatform(p)} className="btn btn-sm"
              style={{ background: platform === p ? 'var(--primary)' : 'var(--surface-3)', color: platform === p ? 'white' : 'var(--text-2)', border: '1px solid var(--border)' }}>
              {p === '' ? 'All' : p === 'whatsapp' ? '💬 WhatsApp' : '📸 Instagram'}
            </button>
          ))}
          <select className="select" value={status} onChange={e => setStatus(e.target.value)} style={{ width: '130px' }}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Two-pane layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
        {/* Left: List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div className="flex-center" style={{ height: '120px' }}><div className="spinner" /></div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                <p style={{ fontSize: '13px' }}>No conversations yet</p>
              </div>
            ) : conversations.map(c => (
              <div key={c._id} onClick={() => setSelected(c)} style={{
                padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                background: selected?._id === c._id ? 'var(--surface-2)' : 'transparent',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => { if (selected?._id !== c._id) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (selected?._id !== c._id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <div className="flex gap-2" style={{ alignItems: 'center', overflow: 'hidden' }}>
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{c.platform === 'whatsapp' ? '💬' : '📸'}</span>
                    <span style={{ fontWeight: '600', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customerName || c.customerId}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)', flexShrink: 0 }}>{new Date(c.lastActivityAt).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="truncate text-faint text-xs" style={{ marginBottom: '5px' }}>{c.lastMessage || 'No messages'}</p>
                <div className="flex gap-1">
                  <span className={`badge ${STATUS_COLORS[c.status] || 'badge-gray'} text-xs`}>{c.status}</span>
                  <span className={`badge ${LEAD_COLORS[c.leadStatus] || 'badge-gray'} text-xs`}>{c.leadStatus}</span>
                  {c.isHandedOff && <span className="badge badge-yellow text-xs">👤 Handed off</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Messages */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selected ? (
            <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: '12px', color: 'var(--text-3)' }}>
              <span style={{ fontSize: '48px' }}>💬</span>
              <p>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Conv header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div className="flex-between">
                  <div className="flex gap-3" style={{ alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: selected.platform === 'whatsapp' ? 'rgba(37,211,102,0.15)' : 'rgba(225,48,108,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      {selected.platform === 'whatsapp' ? '💬' : '📸'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{selected.customerName || selected.customerId}</div>
                      <div className="text-faint text-xs">{selected.customerPhone || selected.platform} · {selected.messageCount || 0} messages</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select className="select" value={selected.leadStatus} onChange={e => updateConversation(selected._id, { leadStatus: e.target.value })} style={{ width: '130px', fontSize: '12px', padding: '5px 8px' }}>
                      {['new', 'interested', 'qualified', 'ordered', 'completed', 'lost'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="select" value={selected.status} onChange={e => updateConversation(selected._id, { status: e.target.value })} style={{ width: '110px', fontSize: '12px', padding: '5px 8px' }}>
                      {['open', 'pending', 'resolved', 'spam'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {!selected.isHandedOff && (
                      <button className="btn btn-secondary btn-sm" onClick={() => updateConversation(selected._id, { isHandedOff: true })}>
                        👤 Take Over
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.map((m, i) => (
                  <div key={m._id || i} style={{ display: 'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '72%', padding: '10px 14px',
                      borderRadius: m.direction === 'outbound' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: m.direction === 'outbound' ? 'var(--primary)' : 'var(--surface-3)',
                      fontSize: '13px', lineHeight: '1.6',
                    }}>
                      <p>{m.content}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: m.direction === 'outbound' ? 'rgba(255,255,255,0.5)' : 'var(--text-3)' }}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.aiGenerated && <span style={{ fontSize: '10px', color: m.direction === 'outbound' ? 'rgba(255,255,255,0.6)' : 'var(--primary)' }}>🤖 AI</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>

              {/* Handoff notice */}
              {selected.isHandedOff && (
                <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.1)', borderTop: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: 'var(--warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👤 AI paused — you have taken over this conversation</span>
                  <button className="btn btn-sm" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: 'var(--warning)', padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => updateConversation(selected._id, { isHandedOff: false })}>
                    Re-enable AI
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
