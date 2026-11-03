'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`))
      .finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/login');
  };

  if (!checked || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  return <AuthContext.Provider value={{ user, isAdmin: user.role === 'admin', logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
