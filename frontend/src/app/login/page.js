// src/app/login/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '36px', fontWeight: '800', background: 'linear-gradient(135deg, #7C5CFF, #9B7FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '6px' }}>
            ⚡ ReplyAI ERP
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>AI-powered messaging for every business</p>
        </div>
        <div className="card card-lg">
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Sign in to your workspace</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@business.com" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required autoFocus />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link href="/forgot-password" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }}></span> Signing in...</> : 'Sign In →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-2)', fontSize: '13px' }}>
            No account? <Link href="/signup" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
