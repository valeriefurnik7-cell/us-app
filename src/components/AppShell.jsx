'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { App, Block, Page, Preloader } from 'konsta/react';
import { ThemeProvider } from './ThemeProvider';
import { SessionProvider, useSession } from './SessionProvider';
import AppTabbar from './AppTabbar';
import { AccentFromPair } from './AppearanceSheet';
import LoginScreen from './auth/LoginScreen';
import OnboardingScreen from './auth/OnboardingScreen';
import { TABBAR_SCREENS, TABS, tabForPath } from '@/lib/tabs';
import { isConfigured } from '@/lib/supabase';

// Remembers the last tab section so inner screens can show "‹ Section" as the back label.
const SectionContext = createContext(TABS[0]);
export const useParentSection = () => useContext(SectionContext);

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
      <AccentFromPair />
      {children}
      <AppTabbar />
    </>
  );
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

  return (
    <ThemeProvider>
      <SectionContext.Provider value={section}>
      <MainScreenContext.Provider value={mainScreen}>
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
      </MainScreenContext.Provider>
      </SectionContext.Provider>
    </ThemeProvider>
  );
}
