'use client';

import NextLink from 'next/link';
import { TABBAR_SCREENS } from '@/lib/tabs';

/**
 * next/link that tags the navigation for the screen animation (see Screen.jsx):
 * switching to a tab crossfades, going deeper slides in from the right like iOS.
 */
export default function AppLink({ href, transitionTypes, ...props }) {
  const type = TABBAR_SCREENS.has(String(href).split('?')[0]) ? 'tab' : 'nav-forward';
  return <NextLink href={href} transitionTypes={transitionTypes ?? [type]} {...props} />;
}
