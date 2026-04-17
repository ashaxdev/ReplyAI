// src/app/dashboard/layout.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { useAuth } from '../../lib/AuthContext';
import { useAuth } from '../../lib/AuthContext';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }) {
  const { tenant, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !tenant) router.replace('/login');
  }, [tenant, loading]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>Loading workspace...</p>
      </div>
    </div>
  );
  if (!tenant) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ marginLeft: '240px', flex: 1, padding: '28px 32px', minHeight: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
