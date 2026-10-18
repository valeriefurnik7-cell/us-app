'use client';

import NextLink from 'next/link';
import { TABS } from '@/lib/tabs';

const TAB_ROOTS = new Set(TABS.map((t) => t.href));

/**
 * next/link that tags the navigation for the screen animation (see Screen.jsx):
 * switching to a tab crossfades, going deeper slides in from the right like iOS.
 */
export default function AppLink({ href, transitionTypes, ...props }) {
  const type = TAB_ROOTS.has(href) ? 'tab' : 'nav-forward';
  return <NextLink href={href} transitionTypes={transitionTypes ?? [type]} {...props} />;
}
