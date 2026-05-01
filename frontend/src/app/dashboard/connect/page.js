'use client';
import { useState, useEffect } from 'react';
import API from '../../../lib/api';
import ConnectMetaAdsSection from './ads/page';

export default function ConnectPage() {
  const [platforms, setPlatforms] = useState([]);
  const [waForm, setWaForm] = useState({ phoneNumberId: '', accessToken: '' });
  const [igForm, setIgForm] = useState({ instagramAccountId: '', accessToken: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState('');
  const [copied, setCopied] = useState('');

  const load = () => API.get('/api/platforms').then(r => setPlatforms(r.data));
  useEffect(() => { load(); }, []);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const connectWA = async (e) => {
    e.preventDefault(); setLoading('wa');
    try {
      const r = await API.post('/api/platforms/whatsapp', waForm);
      setResult({ ...r.data, platform: 'whatsapp' });
      setWaForm({ phoneNumberId: '', accessToken: '' });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Connection failed'); }
    setLoading('');
  };

  const connectIG = async (e) => {
    e.preventDefault(); setLoading('ig');
    try {
      const r = await API.post('/api/platforms/instagram', igForm);
      setResult({ ...r.data, platform: 'instagram' });
      setIgForm({ instagramAccountId: '', accessToken: '' });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Connection failed'); }
    setLoading('');
  };

  const disconnect = async (platform) => {
    if (!confirm(`Disconnect ${platform}? AI will stop replying on this platform.`)) return;
    await API.delete(`/api/platforms/${platform}`);
    load();
  };

  const waConn = platforms.find(p => p.platform === 'whatsapp');
  const igConn = platforms.find(p => p.platform === 'instagram');

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Connect Platforms</h1>
        <p className="text-muted mt-1 text-sm">Link your WhatsApp Business and Instagram to enable AI auto-replies</p>
      </div>

      {/* Success result */}
      {result && (
        <div className="alert alert-success" style={{ marginBottom: '24px' }}>
          <div style={{ fontWeight: '700', marginBottom: '10px' }}>✅ {result.platform === 'whatsapp' ? 'WhatsApp' : 'Instagram'} connected! Now set up the webhook in Meta:</div>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-3)' }}>Webhook URL: </span>
              <span style={{ color: 'var(--success)' }}>{result.webhookUrl}</span>
              <button onClick={() => copy(result.webhookUrl, 'url')} style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: '11px' }}>
                {copied === 'url' ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
            <div>
              <span style={{ color: 'var(--text-3)' }}>Verify Token: </span>
              <span style={{ color: 'var(--success)' }}>{result.verifyToken}</span>
              <button onClick={() => copy(result.verifyToken, 'token')} style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: '11px' }}>
                {copied === 'token' ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
          {result.instructions?.map((line, i) => (
            <p key={i} style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '6px' }}>{line}</p>
          ))}
          <button onClick={() => setResult(null)} style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '12px' }}>Dismiss ×</button>
        </div>
      )}

      <div className="grid-2" style={{ gap: '20px', marginBottom: '28px' }}>
        {/* WhatsApp */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '18px' }}>
            <div className="flex gap-3" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '32px' }}>💬</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>WhatsApp Business</div>
                <div className="text-faint text-xs">Meta Cloud API</div>
              </div>
            </div>
            {waConn?.isConnected && (
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                <div className="pulse-dot" style={{ background: 'var(--success)' }} />
                <span className="badge badge-green">Active</span>
              </div>
            )}
          </div>

          {waConn?.isConnected ? (
            <div>
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <div className="text-faint text-xs" style={{ marginBottom: '3px' }}>Phone Number ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>{waConn.phoneNumberId}</div>
                <div className="text-faint text-xs" style={{ marginTop: '6px' }}>Messages sent: {waConn.messagesSent || 0}</div>
              </div>
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => disconnect('whatsapp')}>
                Disconnect WhatsApp
              </button>
            </div>
          ) : (
            <form onSubmit={connectWA} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Phone Number ID</label>
                <input className="input" value={waForm.phoneNumberId} onChange={e => setWaForm(f => ({ ...f, phoneNumberId: e.target.value }))} placeholder="From Meta App → WhatsApp → API Setup" required />
              </div>
              <div>
                <label className="label">Access Token</label>
                <input className="input" type="password" value={waForm.accessToken} onChange={e => setWaForm(f => ({ ...f, accessToken: e.target.value }))} placeholder="System User permanent token" required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading === 'wa'}>
                {loading === 'wa' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Connecting...</> : '🔗 Connect WhatsApp'}
              </button>
            </form>
          )}
        </div>

        {/* Instagram */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: '18px' }}>
            <div className="flex gap-3" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '32px' }}>📸</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '16px' }}>Instagram DMs</div>
                <div className="text-faint text-xs">Meta Graph API</div>
              </div>
            </div>
            {igConn?.isConnected && (
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                <div className="pulse-dot" style={{ background: 'var(--success)' }} />
                <span className="badge badge-green">Active</span>
              </div>
            )}
          </div>

          {igConn?.isConnected ? (
            <div>
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
                <div className="text-faint text-xs" style={{ marginBottom: '3px' }}>Instagram Account ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>{igConn.instagramAccountId}</div>
                <div className="text-faint text-xs" style={{ marginTop: '6px' }}>Messages sent: {igConn.messagesSent || 0}</div>
              </div>
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => disconnect('instagram')}>
                Disconnect Instagram
              </button>
            </div>
          ) : (
            <form onSubmit={connectIG} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Instagram Account ID</label>
                <input className="input" value={igForm.instagramAccountId} onChange={e => setIgForm(f => ({ ...f, instagramAccountId: e.target.value }))} placeholder="From Meta App → Instagram Setup" required />
              </div>
              <div>
                <label className="label">Page Access Token</label>
                <input className="input" type="password" value={igForm.accessToken} onChange={e => setIgForm(f => ({ ...f, accessToken: e.target.value }))} placeholder="Facebook Page Access Token" required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading === 'ig'}>
                {loading === 'ig' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Connecting...</> : '🔗 Connect Instagram'}
              </button>
            </form>
          )}
        </div>
      </div>
      <ConnectMetaAdsSection/>
    
      {/* How-to guide */}
      <div className="card">
        <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px' }}>📋 Quick Setup Guide</h3>
        <div className="grid-2" style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.9 }}>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>WhatsApp Business API</div>
            <ol style={{ paddingLeft: '16px' }}>
              <li>Go to <strong>developers.facebook.com</strong></li>
              <li>Create a Meta App → Add <strong>WhatsApp</strong> product</li>
              <li>WhatsApp → API Setup → copy <strong>Phone Number ID</strong></li>
              <li>Create a <strong>System User</strong> in Business Manager</li>
              <li>Generate permanent token with <code>whatsapp_business_messaging</code></li>
              <li>Paste both above → click Connect</li>
              <li>Copy the Webhook URL + Verify Token shown</li>
              <li>Paste in Meta App → Webhooks → Verify and Save</li>
              <li>Subscribe to: <strong>messages</strong></li>
            </ol>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>Instagram DM API</div>
            <ol style={{ paddingLeft: '16px' }}>
              <li>Instagram account must be <strong>Business / Creator</strong></li>
              <li>Link Instagram to a <strong>Facebook Page</strong></li>
              <li>Meta App → Add <strong>Instagram</strong> product</li>
              <li>Go to Instagram → Basic Display → copy <strong>Account ID</strong></li>
              <li>Generate <strong>Page Access Token</strong> from linked FB Page</li>
              <li>Enable permission: <code>instagram_manage_messages</code></li>
              <li>Paste both → click Connect</li>
              <li>Copy Webhook URL → paste in Meta App → Webhooks</li>
              <li>Subscribe to: <strong>messages</strong></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
