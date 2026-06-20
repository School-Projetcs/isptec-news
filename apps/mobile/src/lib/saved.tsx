import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SavedIdsResponse } from '@isptec/shared';
import { api } from './api';
import { useAuth } from './auth';

// Estado global das notícias GUARDADAS (server-side, por conta) — paridade com a Web.
// No Mobile o utilizador está sempre autenticado nas telas internas, por isso o toggle
// chama sempre a API; mantém-se um conjunto de ids em memória com atualização otimista.

type SavedCtx = {
  isSaved: (newsId: string) => boolean;
  toggle: (news: { id: string; slug: string }) => Promise<void>;
  count: number;
  version: number; // muda a cada alteração — para revalidar a lista "Guardadas"
};

const Ctx = createContext<SavedCtx | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let on = true;
    if (!user) {
      setIds(new Set());
      return;
    }
    api
      .get<SavedIdsResponse>('/news/saved/ids')
      .then((d) => { if (on) setIds(new Set(d.ids)); })
      .catch(() => { /* silencioso */ });
    return () => { on = false; };
  }, [user]);

  const isSaved = useCallback((newsId: string) => ids.has(newsId), [ids]);

  const toggle = useCallback(async (news: { id: string; slug: string }) => {
    const currently = ids.has(news.id);
    setIds((prev) => {
      const next = new Set(prev);
      if (currently) next.delete(news.id);
      else next.add(news.id);
      return next;
    });
    setVersion((v) => v + 1);
    try {
      if (currently) await api.del(`/news/${news.slug}/save`);
      else await api.post(`/news/${news.slug}/save`);
    } catch {
      setIds((prev) => {
        const next = new Set(prev);
        if (currently) next.add(news.id);
        else next.delete(news.id);
        return next;
      });
      setVersion((v) => v + 1);
    }
  }, [ids]);

  return (
    <Ctx.Provider value={{ isSaved, toggle, count: ids.size, version }}>{children}</Ctx.Provider>
  );
}

export function useSaved() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSaved fora do SavedProvider');
  return c;
}
