import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sistema de tema do Mobile, em paridade com a Web (apps/web/src/lib/theme.tsx):
//   • Três escolhas: "system" (default), "light" e "dark".
//   • "system" segue a preferência do SO via useColorScheme() e reage em tempo real.
//   • Uma escolha manual (claro/escuro) sobrepõe-se ao sistema.
//   • A escolha persiste em AsyncStorage (chave isptec_theme) — mesmo padrão do tokenStore.

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ThemeName = 'light' | 'dark'; // tema efetivo aplicado

export type Palette = {
  bg: string;
  card: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  ink: string;
  primary: string;
  good: string;
  bad: string;
  live: string;
};

// Tema CLARO editorial (valores originais, alinhados com a Web/Euronews).
const light: Palette = {
  bg: '#ffffff',
  card: '#ffffff',
  surface: '#f5f6f8',
  border: '#e6e8ec',
  text: '#14181f',
  muted: '#5b6472',
  ink: '#0b1f3a', // navy — títulos/marca
  primary: '#e02424', // vermelho noticioso — acento/ações/ao vivo
  good: '#15803d',
  bad: '#e02424',
  live: '#e02424',
};

// Tema ESCURO — espelha os tokens da Web (:root[data-theme="dark"] em styles.css).
const dark: Palette = {
  bg: '#0b1020',
  card: '#121a33',
  surface: '#0f1730',
  border: '#25304d',
  text: '#e7ecf5',
  muted: '#8b97b3',
  ink: '#e7ecf5',
  primary: '#ff5a5f',
  good: '#4ade80',
  bad: '#f87171',
  live: '#ff5a5f',
};

export const palettes: Record<ThemeName, Palette> = { light, dark };

const KEY = 'isptec_theme';

type ThemeCtx = {
  /** Escolha do utilizador (system/light/dark). */
  choice: ThemeChoice;
  /** Tema efetivo (light/dark) depois de resolver "system". */
  name: ThemeName;
  /** Paleta efetiva a consumir nas telas. */
  theme: Palette;
  /** Define a escolha (persiste). */
  setChoice: (c: ThemeChoice) => void;
  /** Avança ciclicamente: sistema → claro → escuro → sistema (botão do cabeçalho). */
  cycle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null (preferência do SO)
  const [choice, setChoiceState] = useState<ThemeChoice>('system');

  // Restaura a escolha guardada (default "system"; valor inválido cai para system).
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') setChoiceState(saved);
      } catch {
        /* AsyncStorage indisponível — mantém "system" */
      }
    })();
  }, []);

  const persist = useCallback((c: ThemeChoice) => {
    AsyncStorage.setItem(KEY, c).catch(() => {
      /* ignora falha de persistência */
    });
  }, []);

  const setChoice = useCallback(
    (c: ThemeChoice) => {
      setChoiceState(c);
      persist(c);
    },
    [persist],
  );

  const cycle = useCallback(() => {
    setChoiceState((c) => {
      const next: ThemeChoice = c === 'system' ? 'light' : c === 'light' ? 'dark' : 'system';
      persist(next);
      return next;
    });
  }, [persist]);

  // Resolve a escolha para o tema efetivo (system → preferência do SO).
  const name: ThemeName = choice === 'system' ? (system === 'dark' ? 'dark' : 'light') : choice;
  const theme = palettes[name];

  const value = useMemo<ThemeCtx>(
    () => ({ choice, name, theme, setChoice, cycle }),
    [choice, name, theme, setChoice, cycle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme fora do ThemeProvider');
  return c;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
