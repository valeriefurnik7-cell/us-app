'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App, Block, Page, Preloader } from 'konsta/react';
import { ThemeProvider } from './ThemeProvider';
import { SessionProvider, useSession } from './SessionProvider';
import AppTabbar from './AppTabbar';
import { AccentFromPair } from './AppearanceSheet';
import LoginScreen from './auth/LoginScreen';
import OnboardingScreen from './auth/OnboardingScreen';
import { TABBAR_SCREENS, TABS, tabForPath } from '@/lib/tabs';
import { isConfigured, isDemo } from '@/lib/supabase';
import { autoSyncLocation } from '@/lib/location';

// Remembers the last tab section so inner screens can show "‹ Section" as the back label.
const SectionContext = createContext(TABS[0]);
export const useParentSection = () => useContext(SectionContext);

// Real history of screens since the last main tab, so ‹ goes to where you actually came from.
const BackContext = createContext({ back: null, setTitle: () => {} });
export const useBack = () => useContext(BackContext);

const NAMES = {
  '/': 'Home',
  '/wishlist': 'Wishlist',
  '/plans': 'Plans',
  '/places': 'Places',
  '/pets': 'Pets',
  '/pets/photos': 'Photos',
  '/updates': 'Updates',
  '/expenses': 'Expenses',
  '/settings': 'Settings',
  '/plans/meetings': 'Meetings',
  '/profile/me': 'Profile',
};
const nameFor = (path, titles) => titles[path] ?? NAMES[path] ?? (path.startsWith('/plans/trips/') ? 'Trip' : path.startsWith('/pets/') ? 'Pet' : 'Back');

/** Glues inputs to the keyboard: exposes its height (--kb) and the visible height (--vvh). */
function useKeyboardInsets() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      const root = document.documentElement.style;
      root.setProperty('--kb', `${Math.round(kb)}px`);
      root.setProperty('--vvh', `${Math.round(vv.height)}px`);
      document.documentElement.toggleAttribute('data-keyboard', kb > 80);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
}

// Last screen with a tabbar — where the full-screen pets chat goes back to.
const MainScreenContext = createContext(TABS[0]);
export const useLastMainScreen = () => useContext(MainScreenContext);

function Gate({ children }) {
  const pathname = usePathname();
  const { status } = useSession();

  // The invite route only stores the code, so it runs before sign-in.
  if (pathname.startsWith('/invite/')) return children;

  if (status === 'loading') {
    return (
      <Page className="flex items-center justify-center">
        <Preloader />
      </Page>
    );
  }
  if (status === 'signed-out') return <LoginScreen />;
  if (status === 'no-pair') return <OnboardingScreen />;
  return (
    <>
      <LocationSync />
      <NotificationRouter />
      <AccentFromPair />
      {children}
      <AppTabbar />
    </>
  );
}

/** Opens the screen a tapped notification is about (the service worker leaves it in a cache). */
function NotificationRouter() {
  const router = useRouter();
  useEffect(() => {
    const go = (url) => {
      if (!url || url === window.location.pathname + window.location.search) return;
      router.push(url);
    };
    const takePending = async () => {
      if (!('caches' in window)) return;
      try {
        const cache = await caches.open('notification-target');
        const hit = await cache.match('/__notification-target');
        if (!hit) return;
        await cache.delete('/__notification-target');
        go(await hit.text());
      } catch {}
    };
    const onMessage = (e) => {
      if (e.data?.type !== 'open') return;
      caches?.open('notification-target').then((c) => c.delete('/__notification-target')).catch(() => {});
      go(e.data.url);
    };
    const onVisible = () => document.visibilityState === 'visible' && takePending();
    takePending();
    navigator.serviceWorker?.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', takePending);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', takePending);
    };
  }, [router]);
  return null;
}

/** Keeps my city (and so time, weather and the distance between us) where the phone actually is. */
function LocationSync() {
  const { me, refresh } = useSession();
  const meId = me?.id;
  useEffect(() => {
    if (!meId || isDemo) return;
    autoSyncLocation(me).then((city) => city && refresh());
    // once per signed-in user per launch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);
  return null;
}

function NotConfigured() {
  return (
    <Page className="flex items-center">
      <Block strong inset className="text-center">
        Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
      </Block>
    </Page>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [section, setSection] = useState(TABS[0]);
  const [mainScreen, setMainScreen] = useState(TABS[0]);
  const tab = tabForPath(pathname);
  if (tab && tab !== section) setSection(tab);
  if (tab && TABBAR_SCREENS.has(tab.href) && tab !== mainScreen) setMainScreen(tab);

  // Screens visited since the last main tab: going back pops, going deeper pushes.
  const [stack, setStack] = useState([]);
  const [seenPath, setSeenPath] = useState(null);
  const [titles, setTitles] = useState({});
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setStack((s) => {
      if (TABBAR_SCREENS.has(pathname)) return [pathname];
      if (s.length >= 2 && s[s.length - 2] === pathname) return s.slice(0, -1);
      if (s.at(-1) === pathname) return s;
      return [...s, pathname];
    });
  }
  const previous = stack.length >= 2 ? stack[stack.length - 2] : null;
  const backValue = {
    back: previous ? { href: previous, label: nameFor(previous, titles) } : null,
    setTitle: (path, title) => setTitles((t) => (t[path] === title ? t : { ...t, [path]: title })),
  };
  useKeyboardInsets();

  return (
    <ThemeProvider>
      <SectionContext.Provider value={section}>
      <MainScreenContext.Provider value={mainScreen}>
      <BackContext.Provider value={backValue}>
        {/* Konsta sizes the app with 100vh, which in Safari is taller than the visible screen
            and hides the bottom of every page under the tabbar. 100dvh is exactly what's visible. */}
        <App theme="ios" dark safeAreas className="h-dvh! min-h-0!">
          {isConfigured ? (
            <SessionProvider>
              <Gate>{children}</Gate>
            </SessionProvider>
          ) : (
            <NotConfigured />
          )}
        </App>
      </BackContext.Provider>
      </MainScreenContext.Provider>
      </SectionContext.Provider>
    </ThemeProvider>
  );
}
