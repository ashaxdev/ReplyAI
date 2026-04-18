'use client';
import { useState, useEffect } from 'react';
import API from '../../../../lib/api';

export default function AdsAnalyticsPage() {
  const [tab, setTab] = useState('performance');
  const [analytics, setAnalytics] = useState(null);
  const [lookalike, setLookalike] = useState(null);
  const [analysis, setAnalysis] = useState({});
  const [loadingAI, setLoadingAI] = useState('');
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    API.get('/api/ads/analytics?period=30d').then(r => setAnalytics(r.data));
    API.get('/api/ads/campaigns').then(r => setCampaigns(r.data.campaigns || []));
  }, []);

  const exportLookalike = async (format = 'json') => {
    if (format === 'csv') {
      window.open('/api/ads/ai/lookalike-export?format=csv', '_blank');
      return;
    }
    setLoadingAI('lookalike');
    try {
      const r = await API.get('/api/ads/ai/lookalike-export');
      setLookalike(r.data);
    } catch (err) { alert('Export failed: ' + err.response?.data?.error); }
    setLoadingAI('');
  };

  const analyseCamera = async (campaignId) => {
    setLoadingAI(campaignId);
    try {
      const r = await API.post(`/api/ads/ai/analyse/${campaignId}`);
      setAnalysis(prev => ({ ...prev, [campaignId]: r.data }));
    } catch (err) { alert('Analysis failed'); }
    setLoadingAI('');
  };

  return (
    <div>
      <div className="flex-between page-header mb-6">
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Ad Analytics</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {['performance', 'lookalike', 'insights'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: tab === t ? '600' : '400',
            color: tab === t ? 'var(--primary)' : 'var(--text-2)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px', textTransform: 'capitalize'
          }}>
            {t === 'performance' ? '📈 Performance' : t === 'lookalike' ? '👥 Lookalike Export' : '🤖 AI Insights'}
          </button>
        ))}
      </div>

      {/* ── PERFORMANCE ── */}
      {tab === 'performance' && (
        <div>
          {analytics?.campaignPerf?.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <p className="text-muted">No campaign data yet. Create your first campaign to see performance metrics.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Campaign</th><th>Impressions</th><th>Clicks</th><th>CTR</th>
                      <th>Leads</th><th>CPL</th><th>Conversions</th><th>Revenue</th><th>ROAS</th><th>Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.campaignPerf || []).map(c => (
                      <tr key={c._id}>
                        <td>
                          <div style={{ fontWeight: '600', fontSize: '13px' }}>{c.name}</div>
                          <span className="badge badge-gray text-xs" style={{ textTransform: 'capitalize' }}>{c.status}</span>
                        </td>
                        <td>{(c.metrics?.impressions || 0).toLocaleString()}</td>
                        <td>{c.metrics?.clicks || 0}</td>
                        <td>{c.metrics?.ctr || 0}%</td>
                        <td style={{ fontWeight: '600' }}>{c.metrics?.leads || 0}</td>
                        <td className="text-muted">₹{c.metrics?.cpl || 0}</td>
                        <td style={{ color: 'var(--success)', fontWeight: '600' }}>{c.metrics?.conversions || 0}</td>
                        <td style={{ color: 'var(--success)', fontWeight: '700' }}>₹{(c.metrics?.revenue || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <span style={{ fontWeight: '700', color: (c.metrics?.roas || 0) >= 2 ? 'var(--success)' : (c.metrics?.roas || 0) >= 1 ? 'var(--warning)' : 'var(--danger)' }}>
                            {(c.metrics?.roas || 0).toFixed(1)}x
                          </span>
                        </td>
                        <td>₹{(c.metrics?.spend || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LOOKALIKE EXPORT ── */}
      {tab === 'lookalike' && (
        <div style={{ maxWidth: '680px' }}>
          <div className="card mb-5">
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Build Lookalike Audience</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '16px', lineHeight: 1.7 }}>
              Export your converted customers' phone numbers. Upload to Meta → Audiences → Custom Audience. Meta will find millions of people who behave like your real buyers. This is the single most powerful targeting technique available.
            </p>
            <div className="flex gap-3">
              <button className="btn btn-primary" onClick={() => exportLookalike('json')} disabled={loadingAI === 'lookalike'}>
                {loadingAI === 'lookalike' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Building...</> : '👥 Generate Export'}
              </button>
              <button className="btn btn-secondary" onClick={() => exportLookalike('csv')}>📥 Download CSV</button>
            </div>
          </div>

          {lookalike && (
            <>
              <div className="card mb-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '18px', marginBottom: '4px' }}>
                  {lookalike.count} customers exported
                </div>
                <p className="text-muted text-sm">Upload this file to Meta to find millions of similar buyers</p>
              </div>

              <div className="card mb-4">
                <h4 style={{ fontWeight: '600', marginBottom: '14px', fontSize: '14px' }}>Step-by-step upload instructions:</h4>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {lookalike.instructions?.map((inst, i) => (
                    <li key={i} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      <span style={{ fontWeight: i === 0 ? '600' : '400' }}>{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {lookalike.preview && (
                <div className="card">
                  <div className="text-faint text-xs mb-2">CSV Preview (first 5 rows):</div>
                  <pre style={{ fontSize: '12px', color: 'var(--text-2)', fontFamily: 'monospace', background: 'var(--surface-3)', padding: '12px', borderRadius: '8px', overflow: 'auto' }}>
                    {lookalike.preview}
                  </pre>
                  <button className="btn btn-primary btn-sm mt-3" onClick={() => exportLookalike('csv')}>📥 Download Full CSV</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {tab === 'insights' && (
        <div>
          {campaigns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
              <p className="text-muted">Create campaigns first to get AI performance insights.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {campaigns.map(c => (
                <div key={c._id} className="card">
                  <div className="flex-between mb-3">
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{c.name}</div>
                      <div className="text-faint text-xs">Spend: ₹{c.metrics?.spend || 0} · Leads: {c.metrics?.leads || 0} · ROAS: {(c.metrics?.roas || 0).toFixed(1)}x</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => analyseCamera(c._id)} disabled={loadingAI === c._id}>
                      {loadingAI === c._id ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Analysing...</> : '🤖 Analyse'}
                    </button>
                  </div>

                  {analysis[c._id] && (
                    <div className="fade-in">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: analysis[c._id].overallScore >= 70 ? 'var(--success)' : analysis[c._id].overallScore >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                          {analysis[c._id].overallScore}/100
                        </div>
                        <p className="text-muted text-sm">{analysis[c._id].verdict}</p>
                      </div>

                      <div className="grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <div className="text-faint text-xs mb-2">What's working</div>
                          {analysis[c._id].strengths?.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '13px' }}>
                              <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span>
                              <span className="text-muted">{s}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="text-faint text-xs mb-2">Issues</div>
                          {analysis[c._id].issues?.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '13px' }}>
                              <span style={{ color: 'var(--danger)', flexShrink: 0 }}>✗</span>
                              <span className="text-muted">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-faint text-xs mb-2">Recommendations</div>
                      {analysis[c._id].recommendations?.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                          <span className={`badge ${r.priority === 'high' ? 'badge-red' : r.priority === 'medium' ? 'badge-yellow' : 'badge-gray'} text-xs`} style={{ flexShrink: 0, textTransform: 'capitalize' }}>{r.priority}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '500' }}>{r.action}</div>
                            <div className="text-faint text-xs mt-1">{r.impact}</div>
                          </div>
                        </div>
                      ))}

                      <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.15)', borderRadius: '8px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--primary-l)', fontWeight: '600' }}>Next step: </span>
                        <span className="text-muted">{analysis[c._id].nextStep}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
