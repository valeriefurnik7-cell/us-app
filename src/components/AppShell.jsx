'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { App, Block, Page, Preloader } from 'konsta/react';
import { ThemeProvider } from './ThemeProvider';
import { SessionProvider, useSession } from './SessionProvider';
import AppTabbar from './AppTabbar';
import LoginScreen from './auth/LoginScreen';
import OnboardingScreen from './auth/OnboardingScreen';
import { TABS, tabForPath } from '@/lib/tabs';
import { isConfigured } from '@/lib/supabase';

// Remembers the last tab section so inner screens can show "‹ Section" as the back label.
const SectionContext = createContext(TABS[0]);
export const useParentSection = () => useContext(SectionContext);

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
      {children}
      <AppTabbar />
    </>
  );
}

function NotConfigured() {
  return (
    <Page className="flex items-center">
      <Block strong inset className="text-center">
        Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </Block>
    </Page>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [section, setSection] = useState(TABS[0]);
  const tab = tabForPath(pathname);
  if (tab && tab !== section) setSection(tab);

  return (
    <ThemeProvider>
      <SectionContext.Provider value={section}>
        <App theme="ios" dark safeAreas>
          {isConfigured ? (
            <SessionProvider>
              <Gate>{children}</Gate>
            </SessionProvider>
          ) : (
            <NotConfigured />
          )}
        </App>
      </SectionContext.Provider>
    </ThemeProvider>
  );
}
