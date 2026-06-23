import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { PublicUser, AuthResponse } from '@isptec/shared';
import { api, tokenStore } from './api';

type AuthCtx = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: PublicUser) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await tokenStore.get();
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        setUser(await api.get<PublicUser>('/auth/me'));
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    await tokenStore.set(data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    const data = await api.post<AuthResponse>('/auth/register', { name, email, password });
    await tokenStore.set(data.token);
    setUser(data.user);
  }

  async function logout() {
    await tokenStore.clear();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
