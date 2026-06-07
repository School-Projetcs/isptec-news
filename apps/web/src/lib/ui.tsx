import { createContext, useContext, useState, type ReactNode } from 'react';
import { NewsModal } from '../components/NewsModal';
import { LiveModal } from '../components/LiveModal';

// Provider de UI global: centraliza os modais de ação admin (criar/editar notícia e
// iniciar transmissão) para que possam ser abertos de qualquer sítio (dropdown,
// gestão) sem navegar. Notifica as listas via evento quando uma notícia muda.

export const NEWS_CHANGED = 'isptec:news-changed';

type UICtx = {
  openNews: (editId?: string | null) => void;
  openLive: () => void;
};
const Ctx = createContext<UICtx | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<{ editId: string | null } | null>(null);
  const [live, setLive] = useState(false);

  return (
    <Ctx.Provider
      value={{
        openNews: (editId = null) => setNews({ editId }),
        openLive: () => setLive(true),
      }}
    >
      {children}
      {news && (
        <NewsModal
          editId={news.editId}
          onClose={() => setNews(null)}
          onDone={() => window.dispatchEvent(new Event(NEWS_CHANGED))}
        />
      )}
      {live && <LiveModal onClose={() => setLive(false)} />}
    </Ctx.Provider>
  );
}

export function useUI() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI fora do UIProvider');
  return c;
}
