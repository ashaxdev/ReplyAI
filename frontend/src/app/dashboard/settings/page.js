'use client';
import { useState, useEffect } from 'react';
import API from '../../../lib/api';

const LANGUAGES = [
  { value: 'auto', label: '🌐 Auto-detect (recommended)' },
  { value: 'en', label: 'English' }, { value: 'ta', label: 'Tamil' },
  { value: 'hi', label: 'Hindi' }, { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' }, { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' }, { value: 'bn', label: 'Bengali' },
];

const BUSINESS_TYPES = [
  { value: 'retail', label: '🛍️ Retail / Fashion' },
  { value: 'restaurant', label: '🍽️ Restaurant / Food' },
  { value: 'grocery', label: '🛒 Grocery' },
  { value: 'electronics', label: '📱 Electronics' },
  { value: 'salon', label: '💇 Salon / Spa' },
  { value: 'pharmacy', label: '💊 Pharmacy' },
  { value: 'real_estate', label: '🏠 Real Estate' },
  { value: 'education', label: '📚 Education' },
  { value: 'services', label: '🔧 Services' },
  { value: 'wholesale', label: '📦 Wholesale' },
  { value: 'manufacturing', label: '🏭 Manufacturing' },
  { value: 'other', label: '💼 Other' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('business');
  const [business, setBusiness] = useState({ businessName: '', businessType: 'retail', businessDescription: '', currency: 'INR', timezone: 'Asia/Kolkata' });
  const [ai, setAi] = useState({ greeting: '', policies: '', outOfStockMsg: '', humanHandoffKeywords: [], orderCaptureEnabled: true, language: 'auto', tone: 'friendly', customInstructions: '' });
  const [profile, setProfile] = useState({ ownerName: '', phone: '' });
  const [handoffInput, setHandoffInput] = useState('');
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    API.get('/api/settings').then(r => {
      setBusiness({ businessName: r.data.businessName || '', businessType: r.data.businessType || 'retail', businessDescription: r.data.businessDescription || '', currency: r.data.currency || 'INR', timezone: r.data.timezone || 'Asia/Kolkata' });
      if (r.data.aiSettings) {
        const a = r.data.aiSettings;
        setAi({ greeting: a.greeting || '', policies: a.policies || '', outOfStockMsg: a.outOfStockMsg || '', humanHandoffKeywords: a.humanHandoffKeywords || [], orderCaptureEnabled: a.orderCaptureEnabled ?? true, language: a.language || 'auto', tone: a.tone || 'friendly', customInstructions: a.customInstructions || '' });
        setHandoffInput((a.humanHandoffKeywords || []).join(', '));
      }
    });
    API.get('/api/auth/me').then(r => setProfile({ ownerName: r.data.ownerName || '', phone: r.data.phone || '' }));
  }, []);

  const save = async (type) => {
    setSaving(type);
    try {
      if (type === 'business') await API.put('/api/settings/business', business);
      if (type === 'ai') {
        const payload = { ...ai, humanHandoffKeywords: handoffInput.split(',').map(s => s.trim()).filter(Boolean) };
        await API.put('/api/settings/ai', payload);
      }
      if (type === 'profile') await API.put('/api/settings/profile', profile);
      setSaved(type);
      setTimeout(() => setSaved(''), 2500);
    } catch (err) { alert(err.response?.data?.error || 'Save failed'); }
    setSaving('');
  };

  const SaveBtn = ({ type }) => (
    <button className="btn btn-primary" onClick={() => save(type)} disabled={saving === type} style={{ alignSelf: 'flex-start', minWidth: '120px' }}>
      {saved === type ? '✅ Saved!' : saving === type ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : 'Save Changes'}
    </button>
  );

  const tabs = ['business', 'ai', 'profile'];

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1" style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: tab === t ? '600' : '400',
            color: tab === t ? 'var(--primary)' : 'var(--text-2)',
            borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-1px', textTransform: 'capitalize', transition: 'all 0.15s'
          }}>
            {t === 'business' ? '🏪 Business' : t === 'ai' ? '🤖 AI Behaviour' : '👤 Profile'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '640px' }}>
        {/* Business tab */}
        {tab === 'business' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Business Information</h2>
            <div>
              <label className="label">Business Name</label>
              <input className="input" value={business.businessName} onChange={e => setBusiness(b => ({ ...b, businessName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Business Type</label>
              <select className="select" value={business.businessType} onChange={e => setBusiness(b => ({ ...b, businessType: e.target.value }))}>
                {BUSINESS_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Business Description (helps AI understand what you do)</label>
              <textarea className="textarea" rows={3} value={business.businessDescription} onChange={e => setBusiness(b => ({ ...b, businessDescription: e.target.value }))} placeholder="Describe your business, specialties, target customers..." />
            </div>
            <div className="grid-2">
              <div>
                <label className="label">Currency</label>
                <select className="select" value={business.currency} onChange={e => setBusiness(b => ({ ...b, currency: e.target.value }))}>
                  <option value="INR">₹ INR (Indian Rupee)</option>
                  <option value="USD">$ USD</option>
                  <option value="AED">AED (Dirham)</option>
                  <option value="GBP">£ GBP</option>
                </select>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select className="select" value={business.timezone} onChange={e => setBusiness(b => ({ ...b, timezone: e.target.value }))}>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Europe/London">London (GMT)</option>
                </select>
              </div>
            </div>
            <SaveBtn type="business" />
          </div>
        )}

        {/* AI tab */}
        {tab === 'ai' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>AI Behaviour Configuration</h2>

            <div className="grid-2">
              <div>
                <label className="label">Reply Language</label>
                <select className="select" value={ai.language} onChange={e => setAi(a => ({ ...a, language: e.target.value }))}>
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tone</label>
                <select className="select" value={ai.tone} onChange={e => setAi(a => ({ ...a, tone: e.target.value }))}>
                  <option value="friendly">😊 Friendly</option>
                  <option value="formal">🤝 Formal / Professional</option>
                  <option value="casual">🎉 Casual / Fun</option>
                  <option value="professional">💼 Neutral Professional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Greeting Message (shown to new customers)</label>
              <input className="input" value={ai.greeting} onChange={e => setAi(a => ({ ...a, greeting: e.target.value }))} placeholder="Hello! Welcome to our shop 👋 How can I help you today?" />
            </div>

            <div>
              <label className="label">Shop Policies (delivery, payment, returns — AI shares this with customers)</label>
              <textarea className="textarea" rows={4} value={ai.policies} onChange={e => setAi(a => ({ ...a, policies: e.target.value }))} placeholder="Delivery: 3-5 days across India. COD available. Returns within 7 days. Payment: UPI / Bank transfer / COD." />
            </div>

            <div>
              <label className="label">Out of Stock Message</label>
              <input className="input" value={ai.outOfStockMsg} onChange={e => setAi(a => ({ ...a, outOfStockMsg: e.target.value }))} placeholder="Sorry, this is out of stock. Can I suggest something similar?" />
            </div>

            <div>
              <label className="label">Human Handoff Keywords (when customer says these, AI pauses and flags for you)</label>
              <input className="input" value={handoffInput} onChange={e => setHandoffInput(e.target.value)} placeholder="agent, human, talk to someone, manager, complaint" />
              <p className="text-faint text-xs mt-1">Comma-separated. Current: {handoffInput || 'agent, human, person, talk to someone'}</p>
            </div>

            <div>
              <label className="label">Custom AI Instructions (advanced — direct instructions to the AI)</label>
              <textarea className="textarea" rows={3} value={ai.customInstructions} onChange={e => setAi(a => ({ ...a, customInstructions: e.target.value }))} placeholder="Always mention our free delivery on orders above ₹500. Never discuss competitor pricing. Always end with asking if there's anything else you can help with." />
            </div>

            <div className="flex gap-3" style={{ alignItems: 'center' }}>
              <input type="checkbox" id="orderCapture" checked={ai.orderCaptureEnabled} onChange={e => setAi(a => ({ ...a, orderCaptureEnabled: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <label htmlFor="orderCapture" style={{ cursor: 'pointer', fontSize: '13px' }}>
                Enable AI order capture (AI will collect customer name, address, product details to complete orders)
              </label>
            </div>

            <SaveBtn type="ai" />
          </div>
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Account Profile</h2>
            <div>
              <label className="label">Full Name</label>
              <input className="input" value={profile.ownerName} onChange={e => setProfile(p => ({ ...p, ownerName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input className="input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="label">Password</label>
              <a href="/dashboard/settings/change-password" style={{ display: 'inline-block', color: 'var(--primary)', fontSize: '13px', textDecoration: 'none' }}>Change password →</a>
            </div>
            <SaveBtn type="profile" />
          </div>
        )}
      </div>
    </div>
  );
}
