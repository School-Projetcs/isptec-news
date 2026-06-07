import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Tema claro/escuro. Claro por defeito (estilo editorial); a escolha persiste no
// localStorage e aplica-se via [data-theme] no <html>. Um pequeno script no
// index.html aplica o tema guardado antes da pintura (evita flash).

export type Theme = 'light' | 'dark';
const KEY = 'isptec_theme';

function initial(): Theme {
  const saved = localStorage.getItem(KEY);
  return saved === 'dark' ? 'dark' : 'light';
}

type ThemeCtx = { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void };
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme fora do ThemeProvider');
  return c;
}
