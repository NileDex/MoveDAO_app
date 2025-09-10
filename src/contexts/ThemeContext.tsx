import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  cycleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'app_theme_v1';

function getInitialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  console.log('Theme applied:', theme);
  
  // Optional: help form controls pick correct palette
  const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
  if (meta) {
    meta.content = theme === 'light' ? 'light' : 'dark';
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const initial = getInitialTheme();
    // Apply theme immediately during initialization
    if (typeof window !== 'undefined') {
      applyTheme(initial);
    }
    return initial;
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    // Keep in sync if system theme changes and user hasn't explicitly chosen (only on first load)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setThemeState(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const setTheme = (t: AppTheme) => setThemeState(t);

  const cycleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, cycleTheme, isDark: theme === 'dark' }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}


