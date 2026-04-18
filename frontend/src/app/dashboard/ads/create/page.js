'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '../../../../lib/api';

const STEPS = ['Details', 'AI Targeting', 'Ad Copy', 'Budget', 'Review'];
const OBJECTIVES = [
  { value: 'LEAD_GENERATION', label: '🎯 Lead Generation', desc: 'Collect contact info via instant form' },
  { value: 'TRAFFIC', label: '🔗 Website Traffic', desc: 'Drive people to your website' },
  { value: 'CONVERSIONS', label: '🛒 Conversions', desc: 'Get direct purchases' },
  { value: 'BRAND_AWARENESS', label: '📣 Brand Awareness', desc: 'Reach more people' },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState('');
  const [targeting, setTargeting] = useState(null);
  const [copySuggestions, setCopySuggestions] = useState(null);
  const [selectedCopy, setSelectedCopy] = useState(null);

  const [form, setForm] = useState({
    name: '', objective: 'LEAD_GENERATION', platform: 'instagram',
    productName: '', productDescription: '', productPrice: '',
    // Audience
    ageMin: 18, ageMax: 45, genders: ['female'],
    locations: [], interests: [],
    audienceType: 'manual',
    // Creative
    headline: '', primaryText: '', description: '',
    callToAction: 'SHOP_NOW', hashtags: '',
    // Budget
    budgetType: 'daily', budgetAmount: '', startDate: '', endDate: '',
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // AI: Generate targeting
  const generateTargeting = async () => {
    setAiLoading('targeting');
    try {
      const data = await API.post('/api/ads/ai/targeting');
      setTargeting(data.data);
      // Pre-fill form
      f('ageMin', data.data.ageMin || 18);
      f('ageMax', data.data.ageMax || 45);
      f('locations', data.data.topLocations || []);
      f('interests', data.data.interests || []);
    } catch (err) { alert('Could not generate targeting — try manually.'); }
    setAiLoading('');
  };

  // AI: Generate copy
  const generateCopy = async () => {
    if (!form.productName || !form.productPrice) return alert('Enter product name and price first');
    setAiLoading('copy');
    try {
      const data = await API.post('/api/ads/ai/copy', {
        productName: form.productName,
        productDescription: form.productDescription,
        productPrice: form.productPrice,
        campaignGoal: form.objective === 'LEAD_GENERATION' ? 'leads' : 'sales',
      });
      setCopySuggestions(data.data);
    } catch (err) { alert('Could not generate copy — try manually.'); }
    setAiLoading('');
  };

  const applyCopy = (variant) => {
    setSelectedCopy(variant.variant);
    f('headline', variant.headline);
    f('primaryText', variant.primaryText);
    f('description', variant.description);
    f('hashtags', variant.hashtags?.join(' ') || '');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name, objective: form.objective, platform: form.platform,
        audience: {
          name: `${form.name} Audience`,
          ageMin: form.ageMin, ageMax: form.ageMax,
          genders: form.genders,
          locations: typeof form.locations === 'string' ? form.locations.split(',').map(s => s.trim()) : form.locations,
          interests: typeof form.interests === 'string' ? form.interests.split(',').map(s => s.trim()) : form.interests,
          audienceType: form.audienceType,
        },
        creative: {
          headline: form.headline, primaryText: form.primaryText,
          description: form.description, callToAction: form.callToAction,
          hashtags: typeof form.hashtags === 'string' ? form.hashtags.split(/\s+/).filter(Boolean) : form.hashtags,
        },
        budget: {
          type: form.budgetType, amount: parseFloat(form.budgetAmount),
          startDate: form.startDate || undefined, endDate: form.endDate || undefined,
        },
        status: 'draft',
      };
      const res = await API.post('/api/ads/campaigns', payload);
      router.push(`/dashboard/ads/campaigns/${res.data._id}`);
    } catch (err) { alert(err.response?.data?.error || 'Failed to create campaign'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <div className="flex-between mb-6">
        <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Create Ad Campaign</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: i < step ? 'pointer' : 'default' }}
              onClick={() => i < step && setStep(i)}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0, background: i === step ? 'var(--primary)' : i < step ? 'var(--success)' : 'var(--surface-3)', color: i <= step ? 'white' : 'var(--text-3)' }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '13px', fontWeight: i === step ? '600' : '400', color: i === step ? 'var(--text)' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--border)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      <div className="card card-lg">
        {/* ── Step 0: Details ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Campaign Details</h2>
            <div>
              <label className="label">Campaign Name *</label>
              <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Silk Saree Collection — June" required />
            </div>
            <div>
              <label className="label">Objective *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {OBJECTIVES.map(o => (
                  <div key={o.value} onClick={() => f('objective', o.value)} style={{ padding: '12px 14px', borderRadius: '8px', border: `1px solid ${form.objective === o.value ? 'var(--primary)' : 'var(--border)'}`, background: form.objective === o.value ? 'rgba(124,92,255,0.08)' : 'var(--surface-2)', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{o.label}</div>
                    <div className="text-faint text-xs">{o.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label className="label">Product / Service Name *</label>
                <input className="input" value={form.productName} onChange={e => f('productName', e.target.value)} placeholder="Kanjivaram Silk Saree" />
              </div>
              <div>
                <label className="label">Price (₹)</label>
                <input className="input" type="number" value={form.productPrice} onChange={e => f('productPrice', e.target.value)} placeholder="3500" />
              </div>
            </div>
            <div>
              <label className="label">Product Description (helps AI write better copy)</label>
              <textarea className="textarea" value={form.productDescription} onChange={e => f('productDescription', e.target.value)} rows={2} placeholder="Pure Kanjivaram silk, traditional zari work, perfect for weddings..." />
            </div>
            <div>
              <label className="label">Platform</label>
              <div className="flex gap-2">
                {['instagram', 'facebook', 'both'].map(p => (
                  <button key={p} type="button" onClick={() => f('platform', p)} className="btn btn-sm" style={{ background: form.platform === p ? 'var(--primary)' : 'var(--surface-3)', color: form.platform === p ? 'white' : 'var(--text-2)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: AI Targeting ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Audience Targeting</h2>
              <button className="btn btn-primary btn-sm" onClick={generateTargeting} disabled={aiLoading === 'targeting'}>
                {aiLoading === 'targeting' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Analysing...</> : '🤖 AI Generate'}
              </button>
            </div>

            {targeting && (
              <div style={{ background: 'rgba(124,92,255,0.08)', border: '1px solid rgba(124,92,255,0.2)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--primary-l)', marginBottom: '6px' }}>🤖 AI Recommendation</div>
                <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>{targeting.summary}</p>
                <p className="text-faint text-sm">{targeting.reasoning}</p>
                <div className="text-faint text-xs mt-2">Budget: {targeting.budgetRecommendation}</div>
              </div>
            )}

            <div className="grid-2">
              <div>
                <label className="label">Min Age</label>
                <input className="input" type="number" value={form.ageMin} onChange={e => f('ageMin', e.target.value)} min={13} max={65} />
              </div>
              <div>
                <label className="label">Max Age</label>
                <input className="input" type="number" value={form.ageMax} onChange={e => f('ageMax', e.target.value)} min={13} max={65} />
              </div>
            </div>

            <div>
              <label className="label">Gender</label>
              <div className="flex gap-2">
                {['female', 'male', 'all'].map(g => (
                  <button key={g} type="button" onClick={() => f('genders', [g])} className="btn btn-sm" style={{ background: form.genders?.includes(g) ? 'var(--primary)' : 'var(--surface-3)', color: form.genders?.includes(g) ? 'white' : 'var(--text-2)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>{g}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Locations (cities, states — comma separated)</label>
              <input className="input" value={Array.isArray(form.locations) ? form.locations.join(', ') : form.locations} onChange={e => f('locations', e.target.value)} placeholder="Chennai, Coimbatore, Madurai, Bangalore" />
            </div>

            <div>
              <label className="label">Interests (Meta interest keywords — comma separated)</label>
              <textarea className="textarea" value={Array.isArray(form.interests) ? form.interests.join(', ') : form.interests} onChange={e => f('interests', e.target.value)} rows={2} placeholder="ethnic wear, sarees, Indian fashion, wedding shopping, traditional clothing" />
            </div>

            <div>
              <label className="label">Audience Type</label>
              <select className="select" value={form.audienceType} onChange={e => f('audienceType', e.target.value)}>
                <option value="manual">Manual — set targeting above</option>
                <option value="lookalike">Lookalike — based on existing customers</option>
                <option value="advantage_plus">Advantage+ — let Meta's AI decide</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Step 2: Ad Copy ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-between">
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Ad Creative & Copy</h2>
              <button className="btn btn-primary btn-sm" onClick={generateCopy} disabled={aiLoading === 'copy'}>
                {aiLoading === 'copy' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Writing...</> : '🤖 AI Write Copy'}
              </button>
            </div>

            {copySuggestions && (
              <div>
                <div className="text-faint text-xs mb-3">3 AI-generated variants — click to use one:</div>
                {copySuggestions.variants?.map((v, i) => (
                  <div key={i} onClick={() => applyCopy(v)} style={{ padding: '14px', borderRadius: '10px', border: `1px solid ${selectedCopy === v.variant ? 'var(--primary)' : 'var(--border)'}`, background: selectedCopy === v.variant ? 'rgba(124,92,255,0.06)' : 'var(--surface-2)', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.15s' }}>
                    <div className="flex-between mb-2">
                      <div className="flex gap-2 items-center">
                        <span className="badge badge-purple">Variant {v.variant}</span>
                        <span className="text-faint text-xs">{v.angle}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: v.score >= 80 ? 'var(--success)' : 'var(--warning)', fontWeight: '600' }}>Score: {v.score}/100</span>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{v.headline}</div>
                    <p className="text-muted text-sm" style={{ marginBottom: '6px' }}>{v.primaryText}</p>
                    <p className="text-faint text-xs">{v.whyItWorks}</p>
                  </div>
                ))}
                {copySuggestions.bestVariant && (
                  <div className="alert alert-info" style={{ fontSize: '12px' }}>
                    🤖 AI recommends <strong>Variant {copySuggestions.bestVariant}</strong> — {copySuggestions.bestVariantReason}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="label">Headline * (max 40 chars)</label>
              <input className="input" value={form.headline} onChange={e => f('headline', e.target.value)} maxLength={40} placeholder="New Kanjivaram Collection — Shop Now" />
              <div className="text-faint text-xs mt-1">{(form.headline || '').length}/40 chars</div>
            </div>
            <div>
              <label className="label">Primary Text * (main ad text, max 125 chars)</label>
              <textarea className="textarea" value={form.primaryText} onChange={e => f('primaryText', e.target.value)} rows={2} maxLength={125} placeholder="Discover our new collection of pure Kanjivaram sarees. Limited pieces available. Order now!" />
              <div className="text-faint text-xs mt-1">{(form.primaryText || '').length}/125 chars</div>
            </div>
            <div className="grid-2">
              <div>
                <label className="label">Description (max 30 chars)</label>
                <input className="input" value={form.description} onChange={e => f('description', e.target.value)} maxLength={30} placeholder="Free shipping. COD available." />
              </div>
              <div>
                <label className="label">Call to Action</label>
                <select className="select" value={form.callToAction} onChange={e => f('callToAction', e.target.value)}>
                  {['SHOP_NOW','LEARN_MORE','CONTACT_US','SIGN_UP','GET_QUOTE','BOOK_NOW'].map(c => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Hashtags (space or comma separated)</label>
              <input className="input" value={form.hashtags} onChange={e => f('hashtags', e.target.value)} placeholder="#saree #kanjivaram #ethnicwear #indianfashion" />
            </div>
          </div>
        )}

        {/* ── Step 3: Budget ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Budget & Schedule</h2>
            <div className="grid-2">
              <div>
                <label className="label">Budget Type</label>
                <div className="flex gap-2">
                  {['daily', 'lifetime'].map(t => (
                    <button key={t} type="button" onClick={() => f('budgetType', t)} className="btn btn-sm" style={{ background: form.budgetType === t ? 'var(--primary)' : 'var(--surface-3)', color: form.budgetType === t ? 'white' : 'var(--text-2)', border: '1px solid var(--border)', textTransform: 'capitalize' }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{form.budgetType === 'daily' ? 'Daily' : 'Total'} Budget (₹) *</label>
                <input className="input" type="number" value={form.budgetAmount} onChange={e => f('budgetAmount', e.target.value)} placeholder={form.budgetType === 'daily' ? '500' : '10000'} />
              </div>
            </div>
            <div className="grid-2">
              <div>
                <label className="label">Start Date</label>
                <input className="input" type="date" value={form.startDate} onChange={e => f('startDate', e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="label">End Date (optional)</label>
                <input className="input" type="date" value={form.endDate} onChange={e => f('endDate', e.target.value)} />
              </div>
            </div>
            <div className="alert alert-info" style={{ fontSize: '13px' }}>
              💡 Recommended starting budget: <strong>₹200–500/day</strong> for 7 days to let Meta's algorithm learn. Scale up what works.
            </div>
          </div>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Review Campaign</h2>
            {[
              { label: 'Name', value: form.name },
              { label: 'Objective', value: form.objective?.replace('_', ' ') },
              { label: 'Platform', value: form.platform },
              { label: 'Product', value: `${form.productName} — ₹${form.productPrice}` },
              { label: 'Audience', value: `Ages ${form.ageMin}–${form.ageMax}, ${Array.isArray(form.locations) ? form.locations.slice(0,3).join(', ') : form.locations?.split(',').slice(0,3).join(', ')}` },
              { label: 'Headline', value: form.headline },
              { label: 'Primary Text', value: form.primaryText },
              { label: 'Budget', value: `₹${form.budgetAmount}/${form.budgetType}` },
            ].map((r, i) => (
              <div key={i} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-muted text-sm">{r.label}</span>
                <span style={{ fontWeight: '500', textAlign: 'right', maxWidth: '60%', fontSize: '13px', textTransform: 'capitalize' }}>{r.value || '—'}</span>
              </div>
            ))}
            <div className="alert alert-warning" style={{ fontSize: '13px' }}>
              ⚠️ This saves as a <strong>draft</strong>. To publish, you still need to copy these settings into Meta Ads Manager and click "Publish" there. Once live, your webhook will capture leads automatically.
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} style={{ minWidth: 100 }}>← Back</button>}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={step === 0 && !form.name}
              style={{ flex: 1 }}>
              Continue →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 1 }}>
              {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : '💾 Save Campaign as Draft'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
