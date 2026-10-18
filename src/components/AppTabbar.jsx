'use client';

import { useLayoutEffect, useRef } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabbar, TabbarLink } from 'konsta/react';
import { TABS, tabForPath } from '@/lib/tabs';
import { useParentSection } from './AppShell';

// iOS 26 floating pill, built from Konsta's own glass tokens.
const GLASS =
  'gap-0! p-1 rounded-full backdrop-blur-lg bg-ios-light-glass dark:bg-ios-dark-glass shadow-ios-light-glass dark:shadow-ios-dark-glass';

// Glass lens that slides under the active tab, with a slight overshoot like iOS.
const INDICATOR =
  'pointer-events-none absolute top-1 bottom-1 left-0 rounded-full opacity-0 bg-white/60 dark:bg-white/12 backdrop-blur-md shadow-ios-light-glass-thumb dark:shadow-ios-dark-glass-thumb data-[ready]:opacity-100 data-[animate]:transition-[translate,width] data-[animate]:duration-300 data-[animate]:ease-[cubic-bezier(0.34,1.36,0.64,1)]';

function scrollPageToTop() {
  document.querySelector('.k-page')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function AppTabbar() {
  const pathname = usePathname();
  const parent = useParentSection();
  // Inner screens (profile, settings) keep their parent tab highlighted.
  const highlighted = tabForPath(pathname) ?? parent;
  const activeIndex = TABS.indexOf(highlighted);
  const indicatorRef = useRef(null);

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const place = () => {
      const links = [...indicator.parentElement.querySelectorAll(':scope > a')];
      const link = links[activeIndex];
      if (!link) return;
      indicator.style.width = `${link.offsetWidth}px`;
      indicator.style.translate = `${link.offsetLeft}px 0`;
      if (indicator.dataset.ready === undefined) {
        indicator.dataset.ready = '';
        // Enable the slide only after the first placement, so it doesn't fly in on load.
        requestAnimationFrame(() => (indicator.dataset.animate = ''));
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [activeIndex]);

  return (
    <Tabbar labels icons className="fixed bottom-0 left-0" innerClassName={GLASS}>
      <span ref={indicatorRef} className={INDICATOR} aria-hidden />
      {TABS.map((tab, i) => {
        const active = i === activeIndex;
        const Icon = active ? tab.iconActive : tab.icon;
        return (
          <TabbarLink
            key={tab.href}
            component={NextLink}
            href={tab.href}
            active={active}
            label={tab.label}
            className="rounded-full px-2!"
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
