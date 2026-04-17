'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import API from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      API.get('/api/auth/me')
        .then(r => setTenant(r.data))
        .catch(() => { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/api/auth/login', { email, password });
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    setTenant(data.tenant);
    return data;
  };

  const signup = async (formData) => {
    const { data } = await API.post('/api/auth/signup', formData);
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem('refresh_token', data.refreshToken);
    setTenant(data.tenant);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setTenant(null);
    window.location.href = '/login';
  };

  const refreshTenant = async () => {
    const { data } = await API.get('/api/auth/me');
    setTenant(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ tenant, loading, login, signup, logout, refreshTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
