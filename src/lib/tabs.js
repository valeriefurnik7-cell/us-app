import {
  Calendar,
  HouseFill,
  House,
  Paw,
  Placemark,
  PlacemarkFill,
  Star,
  StarFill,
} from 'framework7-icons/react';

export const TABS = [
  { href: '/', label: 'Home', icon: House, iconActive: HouseFill },
  { href: '/wishlist', label: 'Wishlist', icon: Star, iconActive: StarFill },
  { href: '/pets', label: 'Pets', icon: Paw, iconActive: Paw, accent: true },
  { href: '/plans', label: 'Plans', icon: Calendar, iconActive: Calendar },
  { href: '/places', label: 'Places', icon: Placemark, iconActive: PlacemarkFill },
];

export function tabForPath(pathname) {
  if (pathname === '/') return TABS[0];
  return TABS.find((t) => t.href !== '/' && pathname.startsWith(t.href)) ?? null;
}
