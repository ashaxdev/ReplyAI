// ================================================================
// src/app/dashboard/audit/page.js
// ================================================================
'use client';
import { useState, useEffect } from 'react';
import API from '../../../lib/api';

const ACTION_COLOR = {
  LOGIN_SUCCESS: 'badge-green', LOGIN_FAILED: 'badge-red', LOGOUT: 'badge-gray',
  PRODUCT_CREATED: 'badge-blue', PRODUCT_UPDATED: 'badge-purple', PRODUCT_DELETED: 'badge-red',
  PLATFORM_CONNECTED: 'badge-green', PLATFORM_DISCONNECTED: 'badge-yellow',
  AI_REPLY_SENT: 'badge-purple', WEBHOOK_RECEIVED: 'badge-blue',
};

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get(`/api/audit?page=${page}&limit=30`).then(r => {
      setLogs(r.data.logs || []);
      setTotal(r.data.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Security Audit Log</h1>
        <p className="text-muted mt-1 text-sm">Immutable record of all actions in your workspace · {total} total events</p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>IP Address</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)' }}>No audit events recorded yet</td></tr>
            ) : logs.map(log => (
              <tr key={log._id}>
                <td className="text-xs text-faint" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString('en-IN')}
                </td>
                <td>
                  <span className={`badge ${ACTION_COLOR[log.action] || 'badge-gray'} text-xs`}>
                    {log.action?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="text-sm">
                  <div>{log.actor?.email || log.actor?.type || '—'}</div>
                  {log.actor?.userAgent && <div className="text-faint text-xs truncate" style={{ maxWidth: '180px' }}>{log.actor.userAgent}</div>}
                </td>
                <td className="text-faint text-xs">{log.actor?.ip || '—'}</td>
                <td>
                  <span className={`badge ${log.success ? 'badge-green' : 'badge-red'} text-xs`}>
                    {log.success ? '✓ Success' : '✗ Failed'}
                  </span>
                  {log.errorMessage && <div className="text-faint text-xs mt-1">{log.errorMessage}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="flex-center gap-2" style={{ marginTop: '20px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="text-muted text-sm">Page {page} of {Math.ceil(total / 30)}</span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: '20px', fontSize: '12px' }}>
        🔒 Audit logs are immutable and automatically expire after 90 days. All actions including logins, product changes, platform connections, and AI replies are logged.
      </div>
    </div>
  );
}

export default AuditPage;
