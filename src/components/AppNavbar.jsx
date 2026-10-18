'use client';

import NextLink from 'next/link';
import { Navbar, NavbarBackLink } from 'konsta/react';
import { GearAlt, Paw } from 'framework7-icons/react';
import { useRouter } from 'next/navigation';
import Avatar from './Avatar';
import { useParentSection } from './AppShell';

// Placeholders until profiles come from Supabase (stage 2).
const PAIR_NAME = 'Us';
const ME = { name: 'Me' };
const HER = { name: 'Friend' };

// 44×44 hit area around smaller visuals
const hit = 'flex h-11 min-w-11 items-center justify-center';

/** Tab-root header: logo + pair name, avatars, settings; iOS large title that collapses on scroll. */
export function AppNavbar({ title }) {
  return (
    <Navbar
      large
      centerTitle
      title={title}
      left={
        <span className="flex items-center gap-2 ps-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
            <Paw className="text-[16px]" />
          </span>
          <span className="text-subhead font-semibold">{PAIR_NAME}</span>
        </span>
      }
      right={
        <span className="flex items-center">
          <NextLink href="/profile/me" aria-label="My profile" className={hit}>
            <Avatar who="me" name={ME.name} />
          </NextLink>
          <NextLink href="/profile/friend" aria-label="Friend's profile" className={`${hit} -ms-2`}>
            <Avatar who="her" name={HER.name} />
          </NextLink>
          <NextLink href="/settings" aria-label="Settings" className={`${hit} text-primary`}>
            <GearAlt className="text-[24px]" />
          </NextLink>
        </span>
      }
    />
  );
}

/** Inner screen header: "‹ Parent section" back link + title. */
export function InnerNavbar({ title }) {
  const router = useRouter();
  const parent = useParentSection();
  return (
    <Navbar
      large
      title={title}
      left={
        <NavbarBackLink
          showText
          text={parent.label}
          onClick={() => (window.history.length > 1 ? router.back() : router.push(parent.href))}
        />
      }
    />
  );
}
