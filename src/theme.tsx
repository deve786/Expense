import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from './db';

export type Colors = {
  bg: string; card: string; text: string; sub: string; line: string; accent: string; accentText: string; danger: string; good: string;
};

const light: Colors = {
  bg: '#F7F7F5', card: '#FFFFFF', text: '#161616', sub: '#7A7A75', line: '#E8E8E4',
  accent: '#161616', accentText: '#FFFFFF', danger: '#D64545', good: '#2E9E6B',
};
const dark: Colors = {
  bg: '#0E0E0E', card: '#1A1A1A', text: '#F2F2F0', sub: '#8E8E88', line: '#2A2A28',
  accent: '#F2F2F0', accentText: '#111111', danger: '#F06B6B', good: '#4CC38A',
};

export type ThemeMode = 'system' | 'light' | 'dark';

type Ctx = {
  c: Colors;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  isDark: boolean;
  symbol: string;
  setSymbol: (s: string) => void;
  budget: number;
  setBudget: (n: number) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [symbol, setSymbolState] = useState('₹');
  const [budget, setBudgetState] = useState(0);

  useEffect(() => {
    (async () => {
      setModeState((await getSetting('theme', 'system')) as ThemeMode);
      setSymbolState(await getSetting('symbol', '₹'));
      setBudgetState(Number(await getSetting('budget', '0')) || 0);
    })();
  }, []);

  const value = useMemo<Ctx>(() => {
    const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return {
      c: isDark ? dark : light,
      mode,
      isDark,
      symbol,
      budget,
      setMode: (m) => { setModeState(m); setSetting('theme', m); },
      setSymbol: (s) => { setSymbolState(s); setSetting('symbol', s); },
      setBudget: (n) => { setBudgetState(n); setSetting('budget', String(n)); },
    };
  }, [mode, system, symbol, budget]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('ThemeProvider missing');
  return v;
}
