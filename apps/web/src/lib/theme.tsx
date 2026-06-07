import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Sistema de tema com três opções: "sistema" (default), "claro" e "escuro".
//   • A escolha do utilizador persiste no localStorage (chave isptec_theme).
//   • O default é "sistema": segue a preferência do SO (prefers-color-scheme) e
//     reage em tempo real quando esta muda.
//   • Uma escolha manual (claro/escuro) sobrepõe-se temporariamente ao sistema.
//   • Um pequeno script no index.html aplica o tema efetivo antes da pintura
//     (evita o flash inicial) — manter a lógica em sincronia com `resolve()`.

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark'; // tema efetivo aplicado ao DOM
const KEY = 'isptec_theme';

const mql = () => window.matchMedia('(prefers-color-scheme: dark)');

/** Lê a escolha guardada; default "system" (qualquer valor inválido cai para system). */
function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    /* localStorage indisponível */
  }
  return 'system';
}

/** Resolve a escolha para o tema efetivo (system → preferência do SO). */
function resolve(choice: ThemeChoice): Theme {
  if (choice === 'system') return mql().matches ? 'dark' : 'light';
  return choice;
}

type ThemeCtx = {
  /** Escolha do utilizador (system/light/dark). */
  choice: ThemeChoice;
  /** Tema efetivo aplicado ao DOM (light/dark). */
  theme: Theme;
  /** Define a escolha (persiste). */
  setChoice: (c: ThemeChoice) => void;
  /** Avança ciclicamente: sistema → claro → escuro → sistema (para o botão do cabeçalho). */
  cycle: () => void;
};
const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [theme, setTheme] = useState<Theme>(() => resolve(readChoice()));

  // Aplica o tema efetivo e persiste a escolha.
  useEffect(() => {
    setTheme(resolve(choice));
    document.documentElement.setAttribute('data-theme', resolve(choice));
    try {
      localStorage.setItem(KEY, choice);
    } catch {
      /* ignora */
    }
  }, [choice]);

  // Em modo "sistema", reage às mudanças de preferência do SO em tempo real.
  useEffect(() => {
    if (choice !== 'system') return;
    const m = mql();
    const onChange = () => {
      const next = m.matches ? 'dark' : 'light';
      setTheme(next);
      document.documentElement.setAttribute('data-theme', next);
    };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => setChoiceState(c), []);
  const cycle = useCallback(
    () => setChoiceState((c) => (c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system')),
    [],
  );

  return <Ctx.Provider value={{ choice, theme, setChoice, cycle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme fora do ThemeProvider');
  return c;
}
