'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import { App } from 'konsta/react';
import { ThemeProvider } from './ThemeProvider';
import AppTabbar from './AppTabbar';
import { TABS, tabForPath } from '@/lib/tabs';

// Remembers the last tab section so inner screens can show "‹ Section" as the back label.
const SectionContext = createContext(TABS[0]);
export const useParentSection = () => useContext(SectionContext);

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [section, setSection] = useState(TABS[0]);
  const tab = tabForPath(pathname);
  if (tab && tab !== section) setSection(tab);

  return (
    <ThemeProvider>
      <SectionContext.Provider value={section}>
        <App theme="ios" dark safeAreas>
          {children}
          <AppTabbar />
        </App>
      </SectionContext.Provider>
    </ThemeProvider>
  );
}
