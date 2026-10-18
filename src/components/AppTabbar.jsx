'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabbar, TabbarLink } from 'konsta/react';
import { TABS, tabForPath } from '@/lib/tabs';

// iOS 26 floating pill, built from Konsta's own glass tokens.
const GLASS =
  'gap-0! p-1 rounded-full backdrop-blur-lg bg-ios-light-glass dark:bg-ios-dark-glass shadow-ios-light-glass dark:shadow-ios-dark-glass';

function scrollPageToTop() {
  document.querySelector('.k-page')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function AppTabbar() {
  const pathname = usePathname();
  const current = tabForPath(pathname);

  return (
    <Tabbar labels icons className="fixed bottom-0 left-0" innerClassName={GLASS}>
      {TABS.map((tab) => {
        // Only the tab root counts as "active" for re-tap; inner screens navigate back to it.
        const active = current?.href === tab.href;
        const Icon = active ? tab.iconActive : tab.icon;
        return (
          <TabbarLink
            key={tab.href}
            component={NextLink}
            href={tab.href}
            active={active}
            label={tab.label}
            className={`rounded-full px-2! ${active ? 'bg-accent/12' : ''}`}
            onClick={(e) => {
              if (pathname === tab.href) {
                e.preventDefault();
                scrollPageToTop();
              }
            }}
            icon={
              tab.accent ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <Icon className="text-[22px]" />
                </span>
              ) : (
                <Icon className="text-[26px]" />
              )
            }
          />
        );
      })}
    </Tabbar>
  );
}
