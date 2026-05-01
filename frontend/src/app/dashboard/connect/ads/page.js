'use client';
import { useState, useEffect } from 'react';
import API from '../../../../lib/api';

// ================================================================
// Add this as a new section inside your existing
// frontend/src/app/dashboard/connect/page.js
// OR create it as a standalone page at
// frontend/src/app/dashboard/connect/ads/page.js
// ================================================================

export default function ConnectMetaAdsSection() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    adAccountId: '',
    pageId: '',
    instagramActorId: '',
    accessToken: '',
    pixelId: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [copied, setCopied] = useState('');

  const loadStatus = () =>
    API.get('/api/ads/connection/status').then(r => setStatus(r.data));

  useEffect(() => { loadStatus(); }, []);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await API.post('/api/ads/connection/connect', form);
      setResult(r.data);
      setForm({ adAccountId: '', pageId: '', instagramActorId: '', accessToken: '', pixelId: '' });
      loadStatus();
    } catch (err) {
      alert(err.response?.data?.error || 'Connection failed');
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Meta Ads? Your campaigns will still be saved.')) return;
    await API.delete('/api/ads/connection/disconnect');
    setResult(null);
    loadStatus();
  };

  const validateToken = async () => {
    setValidating(true);
    try {
      const r = await API.post('/api/ads/connection/validate-token');
      setTokenValid(r.data);
    } catch { setTokenValid({ valid: false }); }
    setValidating(false);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      {/* Header */}
      <div className="flex-between mb-4">
        <div className="flex gap-3 items-center">
          <span style={{ fontSize: '32px' }}>📢</span>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>Meta Ads</div>
            <div className="text-faint text-xs">Instagram & Facebook Ad Campaigns</div>
          </div>
        </div>
        {status?.connected && (
          <div className="flex gap-2 items-center">
            <div className="pulse-dot" style={{ background: 'var(--success)' }} />
            <span className="badge badge-green">Connected</span>
          </div>
        )}
      </div>

      {/* Connected state */}
      {status?.connected ? (
        <div>
          {/* Stats */}
          <div className="grid-3 mb-4" style={{ gap: '12px' }}>
            {[
              { label: 'Total Ad Spend', value: `₹${(status.totalAdSpend || 0).toLocaleString('en-IN')}` },
              { label: 'Total Leads', value: status.totalLeads || 0 },
              { label: 'Conversions', value: status.totalConversions || 0 },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>{s.value}</div>
                <div className="text-faint text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Connection details */}
          <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid var(--border)' }}>
            <div className="text-faint text-xs mb-2">CONNECTION DETAILS</div>
            {[
              { label: 'Ad Account ID', value: status.adAccountId },
              { label: 'Page ID', value: status.pageId || '—' },
              { label: 'Instagram Actor ID', value: status.instagramActorId || '—' },
              { label: 'Connected', value: status.connectedAt ? new Date(status.connectedAt).toLocaleDateString('en-IN') : '—' },
            ].map((r, i) => (
              <div key={i} className="flex-between" style={{ padding: '5px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize: '13px' }}>
                <span className="text-muted">{r.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Validate token */}
          <div className="flex gap-2 mb-4">
            <button className="btn btn-secondary btn-sm" onClick={validateToken} disabled={validating}>
              {validating ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Checking...</> : '🔍 Validate Token'}
            </button>
            {tokenValid && (
              <span className={`badge ${tokenValid.valid ? 'badge-green' : 'badge-red'}`}>
                {tokenValid.valid ? `✓ Valid — ${tokenValid.metaUserName}` : '✗ Token invalid'}
              </span>
            )}
          </div>

          <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
            Disconnect Meta Ads
          </button>
        </div>
      ) : (
        /* Not connected — show form */
        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="alert alert-info" style={{ fontSize: '12px' }}>
            Each client connects their own Meta Ads account. Your data stays completely separate from other clients.
          </div>

          <div>
            <label className="label">Ad Account ID * <span className="text-faint">(e.g. act_123456789)</span></label>
            <input className="input" value={form.adAccountId}
              onChange={e => f('adAccountId', e.target.value)}
              placeholder="act_123456789 — from Meta Ads Manager → Account Settings"
              required />
          </div>

          <div>
            <label className="label">Page Access Token * <span className="text-faint">(long-lived)</span></label>
            <input className="input" type="password" value={form.accessToken}
              onChange={e => f('accessToken', e.target.value)}
              placeholder="From Meta Graph API Explorer → select your Page → generate token"
              required />
            <p className="text-faint text-xs mt-1">
              Needs permissions: ads_management, ads_read, pages_manage_ads, leads_retrieval, instagram_manage_messages
            </p>
          </div>

          <div className="grid-2">
            <div>
              <label className="label">Facebook Page ID</label>
              <input className="input" value={form.pageId}
                onChange={e => f('pageId', e.target.value)}
                placeholder="Your Facebook Page ID" />
            </div>
            <div>
              <label className="label">Instagram Actor ID</label>
              <input className="input" value={form.instagramActorId}
                onChange={e => f('instagramActorId', e.target.value)}
                placeholder="Instagram Business Account ID" />
            </div>
          </div>

          <div>
            <label className="label">Meta Pixel ID <span className="text-faint">(optional — for conversion tracking)</span></label>
            <input className="input" value={form.pixelId}
              onChange={e => f('pixelId', e.target.value)}
              placeholder="Your Meta Pixel ID" />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Connecting...</> : '🔗 Connect Meta Ads'}
          </button>
        </form>
      )}

      {/* Webhook setup result */}
      {result && (
        <div style={{ marginTop: '16px', background: 'var(--success-bg)', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontWeight: '700', color: 'var(--success)', marginBottom: '10px' }}>
            ✅ Connected! Now set up webhook in Meta:
          </div>

          <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '11px', marginBottom: '10px' }}>
            <div style={{ marginBottom: '6px' }}>
              <span className="text-muted">Webhook URL: </span>
              <span style={{ color: '#14532D', wordBreak: 'break-all' }}>{result.webhookUrl}</span>
              <button onClick={() => copy(result.webhookUrl, 'url')}
                style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--success)' }}>
                {copied === 'url' ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
            <div>
              <span className="text-muted">Verify Token: </span>
              <span style={{ color: '#14532D' }}>{result.verifyToken}</span>
              <button onClick={() => copy(result.verifyToken, 'token')}
                style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--success)' }}>
                {copied === 'token' ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>

          <ol style={{ paddingLeft: '16px', fontSize: '12px', color: '#14532D', lineHeight: '2' }}>
            {result.instructions?.map((inst, i) => <li key={i}>{inst}</li>)}
          </ol>

          <button onClick={() => setResult(null)} style={{ marginTop: '8px', background: 'none', border: 'none', color: '#14532D', cursor: 'pointer', fontSize: '11px' }}>
            Dismiss ×
          </button>
        </div>
      )}

      {/* How to get credentials */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: 'var(--text-2)', padding: '8px 0' }}>
          📋 How to get your Meta credentials
        </summary>
        <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-2)', lineHeight: '1.8' }}>
          {[
            { step: '1', text: 'Go to business.facebook.com → Accounts → Ad Accounts → copy your Ad Account ID (looks like act_XXXXXXXXX)' },
            { step: '2', text: 'Go to developers.facebook.com → Tools → Graph API Explorer → select your Facebook Page from dropdown → click Generate Access Token' },
            { step: '3', text: 'In the token generator, select these permissions: ads_management, ads_read, pages_manage_ads, leads_retrieval, instagram_manage_messages, pages_manage_metadata' },
            { step: '4', text: 'Convert to long-lived token: Use the Access Token Debugger tool → Extend Token. This gives a 60-day token (set a reminder to refresh it).' },
            { step: '5', text: 'Your Facebook Page ID: Go to your Facebook Page → About → scroll down → Page ID shown at the bottom' },
            { step: '6', text: 'Instagram Actor ID: Go to Meta Business Suite → Settings → Instagram Accounts → your account ID is shown there' },
          ].map(r => (
            <div key={r.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, marginTop: '2px' }}>{r.step}</div>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
