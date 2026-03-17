import { useState, useEffect, useCallback } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'atc_theme';

function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return 'system';
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(theme: ThemePreference): boolean {
  if (theme === 'system') return getSystemDark();
  return theme === 'dark';
}

function applyDarkClass(isDark: boolean): void {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(getStoredTheme);
  const [isDark, setIsDark] = useState(() => resolveIsDark(getStoredTheme()));

  // Apply the dark class whenever isDark changes
  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    setIsDark(resolveIsDark(newTheme));
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { theme, setTheme, isDark };
}
