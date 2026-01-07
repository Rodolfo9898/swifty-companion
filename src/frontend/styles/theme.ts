export type ThemeName = 'dark' | 'light';

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
};

export const themes = {
  dark: {
    background: '#0f172a',
    surface: '#111827',
    surfaceAlt: '#1f2937',
    border: '#334155',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textSubtle: '#e2e8f0',
    accent: '#38bdf8',
    accentText: '#0f172a',
    error: '#fca5a5',
    progressTrack: '#e5e7eb',
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    border: '#cbd5f5',
    text: '#0f172a',
    textMuted: '#475569',
    textSubtle: '#334155',
    accent: '#0ea5e9',
    accentText: '#f8fafc',
    error: '#dc2626',
    progressTrack: '#e2e8f0',
  },
} as const;

export type ThemeColors = (typeof themes)[ThemeName];
