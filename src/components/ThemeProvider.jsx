'use client';

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'theme';
const STATUS_BAR = { light: '#F2F2F7', dark: '#000000' };
const DARK_QUERY = '(prefers-color-scheme: dark)';
const DEFAULT_MODE = 'dark';

// Runs before first paint (see layout.js) so the page never flashes the wrong theme.
export const themeInitScript = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}')||'${DEFAULT_MODE}';var d=m==='dark'||(m==='system'&&matchMedia('${DARK_QUERY}').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const ThemeContext = createContext({ mode: 'dark', resolved: 'dark', setMode: () => {} });

// Saved mode lives in localStorage; listeners re-render on change.
const modeListeners = new Set();

function readMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function setMode(next) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  modeListeners.forEach((l) => l());
}

function subscribeMode(listener) {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}

function subscribeSystem(listener) {
  const media = matchMedia(DARK_QUERY);
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

const readSystemDark = () => matchMedia(DARK_QUERY).matches;

export function ThemeProvider({ children }) {
  const mode = useSyncExternalStore(subscribeMode, readMode, () => DEFAULT_MODE);
  const systemDark = useSyncExternalStore(subscribeSystem, readSystemDark, () => false);
  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute('content', STATUS_BAR[resolved]);
      m.removeAttribute('media');
    });
  }, [resolved]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
