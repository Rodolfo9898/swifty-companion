import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { ThemeColors, ThemeName, themes, spacing } from './styles/theme';

interface ThemeValue {
  name: ThemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<ThemeName>('dark');

  const toggleTheme = useCallback(() => {
    setName((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      name,
      colors: themes[name],
      spacing,
      toggleTheme,
    }),
    [name, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
