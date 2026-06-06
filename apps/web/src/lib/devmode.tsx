import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Preferência "Modo Programador/Demo": ligada nas Definições, persiste no
// localStorage e sincroniza entre separadores. Quando ligada, o painel de
// eventos (DevPanel) liga-se ao SSE da API e mostra o pipeline em tempo real.

const KEY = 'isptec_devmode';

type DevModeCtx = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
};

const Ctx = createContext<DevModeCtx | null>(null);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => localStorage.getItem(KEY) === '1');

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    localStorage.setItem(KEY, v ? '1' : '0');
  }, []);

  // Sincroniza se a preferência mudar noutro separador.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setEnabledState(e.newValue === '1');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <Ctx.Provider value={{ enabled, setEnabled, toggle: () => setEnabled(!enabled) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDevMode() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDevMode fora do DevModeProvider');
  return c;
}
