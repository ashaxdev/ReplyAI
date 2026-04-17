'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';

const BUSINESS_TYPES = [
  { value: 'retail', label: '🛍️ Retail / Fashion' },
  { value: 'restaurant', label: '🍽️ Restaurant / Food' },
  { value: 'grocery', label: '🛒 Grocery / Supermarket' },
  { value: 'electronics', label: '📱 Electronics' },
  { value: 'salon', label: '💇 Salon / Spa' },
  { value: 'pharmacy', label: '💊 Pharmacy / Medical' },
  { value: 'real_estate', label: '🏠 Real Estate' },
  { value: 'education', label: '📚 Education / Coaching' },
  { value: 'services', label: '🔧 Services / Repair' },
  { value: 'wholesale', label: '📦 Wholesale / Distribution' },
  { value: 'manufacturing', label: '🏭 Manufacturing' },
  { value: 'other', label: '💼 Other Business' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    ownerName: '', email: '', password: '', confirmPassword: '',
    businessName: '', businessType: 'retail', businessDescription: '',
    phone: '', language: 'auto'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleStep1 = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (!/^(?=.*[A-Z])(?=.*[0-9]).{8,}$/.test(form.password))
      return setError('Password needs 8+ chars, one uppercase & one number');
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signup(form);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(135deg, #7C5CFF, #9B7FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚡ ReplyAI ERP</div>
          <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '4px' }}>Start your 14-day free trial — no credit card needed</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', background: step >= s ? 'var(--primary)' : 'var(--surface-3)', color: step >= s ? 'white' : 'var(--text-3)' }}>{s}</div>
              <span style={{ fontSize: '12px', color: step >= s ? 'var(--text)' : 'var(--text-3)', fontWeight: step === s ? '600' : '400' }}>{s === 1 ? 'Account' : 'Business'}</span>
              {s < 2 && <div style={{ width: 40, height: 1, background: step > s ? 'var(--primary)' : 'var(--border)' }} />}
            </div>
          ))}
        </div>

        <div className="card card-lg">
          {error && <div className="alert alert-error">{error}</div>}

          {step === 1 && (
            <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Create your account</h2>
              <div className="grid-2">
                <div><label className="label">Your Full Name</label><input className="input" value={form.ownerName} onChange={e => f('ownerName', e.target.value)} placeholder="Priya Kumar" required /></div>
                <div><label className="label">Phone (optional)</label><input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 98765 43210" /></div>
              </div>
              <div><label className="label">Email Address</label><input className="input" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="you@business.com" required /></div>
              <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" required /></div>
              <div><label className="label">Confirm Password</label><input className="input" type="password" value={form.confirmPassword} onChange={e => f('confirmPassword', e.target.value)} placeholder="••••••••" required /></div>
              <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%', marginTop: '8px' }}>Continue →</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-ghost btn-sm">← Back</button>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Your business details</h2>
              </div>
              <div><label className="label">Business Name *</label><input className="input" value={form.businessName} onChange={e => f('businessName', e.target.value)} placeholder="Priya Fashion Hub" required /></div>
              <div>
                <label className="label">Business Type *</label>
                <select className="select" value={form.businessType} onChange={e => f('businessType', e.target.value)}>
                  {BUSINESS_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                </select>
              </div>
              <div><label className="label">Description (helps AI understand your business)</label><textarea className="textarea" value={form.businessDescription} onChange={e => f('businessDescription', e.target.value)} placeholder="We sell women's ethnic wear — sarees, lehengas, and kurtis. Shipping across India." rows={2} /></div>
              <div>
                <label className="label">AI Reply Language</label>
                <select className="select" value={form.language} onChange={e => f('language', e.target.value)}>
                  <option value="auto">🌐 Auto-detect (recommended)</option>
                  <option value="en">English</option>
                  <option value="ta">Tamil</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                  <option value="ml">Malayalam</option>
                  <option value="mr">Marathi</option>
                  <option value="bn">Bengali</option>
                </select>
              </div>
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating workspace...</> : '🚀 Start Free Trial'}
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center' }}>By signing up, you agree to our Terms of Service and Privacy Policy</p>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-2)', fontSize: '13px' }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
