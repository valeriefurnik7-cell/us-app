'use client';

import { ViewTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Page } from 'konsta/react';
import { TABBAR_SCREENS } from '@/lib/tabs';

// Navigation tags → animation classes in globals.css. Untagged updates don't animate.
const MOTION = { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', tab: 'tab', default: 'none' };

/**
 * Scrollable screen. Bottom padding keeps content clear of the floating tabbar and home indicator.
 * Slides in/out like iOS when navigating deeper or back; crossfades between tabs.
 */
export default function Screen({ children, className }) {
  const pathname = usePathname();
  // Main screens leave room for the floating tabbar; inner screens have none, just the home indicator.
  const onTabRoot = TABBAR_SCREENS.has(pathname);
  const padding = className ?? (onTabRoot ? 'pb-[calc(var(--k-safe-area-bottom)+120px)]' : 'pb-[calc(var(--k-safe-area-bottom)+32px)]');
  return (
    <ViewTransition enter={MOTION} exit={MOTION} default="none">
      <Page className={padding}>{children}</Page>
    </ViewTransition>
  );
}

export function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="mx-4 mt-3 rounded-card bg-surface px-4 py-10 text-center">
      <p className="text-body font-semibold">{title}</p>
      {text && <p className="mt-1 text-subhead text-text-secondary">{text}</p>}
      {actionLabel && (
        <button type="button" onClick={onAction} className="mt-4 h-11 rounded-full bg-accent px-5 text-body font-semibold text-white">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
