import {
  Calendar,
  HouseFill,
  House,
  Paw,
  Creditcard,
  CreditcardFill,
  Star,
  StarFill,
} from 'framework7-icons/react';

export const TABS = [
  { href: '/', label: 'Home', icon: House, iconActive: HouseFill },
  { href: '/wishlist', label: 'Wishlist', icon: Star, iconActive: StarFill },
  { href: '/pets', label: 'Pets', icon: Paw, iconActive: Paw, accent: true },
  { href: '/plans', label: 'Plans', icon: Calendar, iconActive: Calendar },
  { href: '/expenses', label: 'Expenses', icon: Creditcard, iconActive: CreditcardFill },
];

/** Screens that show the tabbar. The pets chat opens full-screen from the paw, like a messenger. */
export const TABBAR_SCREENS = new Set(['/', '/wishlist', '/plans', '/expenses']);

export function tabForPath(pathname) {
  if (pathname === '/') return TABS[0];
  return TABS.find((t) => t.href !== '/' && pathname.startsWith(t.href)) ?? null;
}
