// src/app/page.js
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';

export default function HomePage() {
  const { tenant, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(tenant ? '/dashboard' : '/login');
  }, [tenant, loading]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ fontSize: '28px', fontWeight: '800', background: 'linear-gradient(135deg, #7C5CFF, #9B7FFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚡ ReplyAI ERP</div>
    </div>
  );
}
