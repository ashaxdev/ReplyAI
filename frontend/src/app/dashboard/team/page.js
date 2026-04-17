'use client';
import { useState, useEffect } from 'react';
import API from '../../../lib/api';

const ROLE_COLORS = { admin: 'badge-purple', manager: 'badge-blue', support: 'badge-yellow', viewer: 'badge-gray' };
const ROLE_DESC = { admin: 'Full access', manager: 'Manage products & conversations', support: 'View & update conversations', viewer: 'View only' };

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'support' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => API.get('/api/team').then(r => setMembers(r.data));
  useEffect(() => { load(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await API.post('/api/team/invite', invite);
      setMsg(`✅ Invitation link generated for ${invite.email}`);
      setInvite({ name: '', email: '', role: 'support' });
      setShowInvite(false);
      load();
    } catch (err) { setMsg(`❌ ${err.response?.data?.error || 'Invite failed'}`); }
    setLoading(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const remove = async (id, name) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    await API.delete(`/api/team/${id}`);
    load();
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Team Members</h1>
          <p className="text-muted mt-1 text-sm">Manage who has access to your ReplyAI workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowInvite(true)}>+ Invite Member</button>
      </div>

      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}

      {/* Roles guide */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-2)' }}>ROLE PERMISSIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {Object.entries(ROLE_DESC).map(([role, desc]) => (
            <div key={role} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: '8px' }}>
              <span className={`badge ${ROLE_COLORS[role]}`} style={{ marginBottom: '6px', textTransform: 'capitalize' }}>{role}</span>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Members table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)' }}>
                No team members yet. Invite your first team member.
              </td></tr>
            ) : members.map(m => (
              <tr key={m._id}>
                <td>
                  <div style={{ fontWeight: '600' }}>{m.name || '—'}</div>
                  <div className="text-faint text-xs">{m.email}</div>
                </td>
                <td><span className={`badge ${ROLE_COLORS[m.role]}`} style={{ textTransform: 'capitalize' }}>{m.role}</span></td>
                <td><span className={`badge ${m.acceptedAt ? 'badge-green' : 'badge-yellow'}`}>{m.acceptedAt ? 'Active' : 'Pending'}</span></td>
                <td className="text-faint text-xs">{m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString('en-IN') : 'Not accepted'}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(m._id, m.name || m.email)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Invite Team Member</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label className="label">Full Name</label><input className="input" value={invite.name} onChange={e => setInvite(i => ({ ...i, name: e.target.value }))} placeholder="Ravi Kumar" /></div>
              <div><label className="label">Email Address *</label><input className="input" type="email" value={invite.email} onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} placeholder="ravi@business.com" required /></div>
              <div>
                <label className="label">Role</label>
                <select className="select" value={invite.role} onChange={e => setInvite(i => ({ ...i, role: e.target.value }))}>
                  <option value="admin">Admin — Full access</option>
                  <option value="manager">Manager — Products & conversations</option>
                  <option value="support">Support — Conversations only</option>
                  <option value="viewer">Viewer — Read only</option>
                </select>
              </div>
              <div className="flex gap-3" style={{ marginTop: '8px' }}>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Sending...' : '📧 Send Invite'}
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowInvite(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
