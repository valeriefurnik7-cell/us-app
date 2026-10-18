'use client';

import { useEffect, useState } from 'react';
import NextLink from '@/components/AppLink';
import { Navbar, NavbarBackLink } from 'konsta/react';
import { GearAlt, Paw, Plus } from 'framework7-icons/react';
import { usePathname, useRouter } from 'next/navigation';
import Avatar from './Avatar';
import { useBack, useLastMainScreen, useParentSection } from './AppShell';
import { useSession } from './SessionProvider';
import PairSheet from './PairSheet';
import { isDemo } from '@/lib/supabase';

// 36px visuals keep the glass pill compact; the invisible ::after grows the tap area to 44×44.
const hit = "relative flex h-9 min-w-9 items-center justify-center after:absolute after:-inset-1 after:content-['']";

/**
 * Tab-root header: logo + pair name, avatars, settings; iOS large title that collapses on scroll.
 * onAdd shows the accent "+" button; titleAccessory sits next to the large title (e.g. a streak).
 */
export function AppNavbar({ title, onAdd, addIcon, titleAccessory, subnavbar }) {
  const AddIcon = addIcon ?? Plus;
  const { me, partner, pair } = useSession();
  const [pairOpen, setPairOpen] = useState(false);
  return (
    <>
    <Navbar
      large
      centerTitle
      subnavbar={subnavbar}
      title={
        titleAccessory ? (
          <span className="inline-flex items-center gap-2">
            {title}
            {titleAccessory}
          </span>
        ) : (
          title
        )
      }
      left={
        <button type="button" onClick={() => setPairOpen(true)} className={`${hit} gap-2 ps-0.5 pe-3`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
            <Paw className="text-[16px]" />
          </span>
          <span className="text-subhead font-semibold">{pair?.name}</span>
          {isDemo && <span className="rounded-full bg-together/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-together uppercase">Demo</span>}
        </button>
      }
      right={
        <span className="flex items-center gap-1 px-0.5">
          {onAdd && (
            <button type="button" onClick={onAdd} aria-label="Add" className={hit}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
                <AddIcon className="text-[18px]" />
              </span>
            </button>
          )}
          <NextLink href="/profile/me" aria-label="My profile" className={hit}>
            <Avatar who="me" name={me?.name} src={me?.avatar} />
          </NextLink>
          <NextLink href="/profile/friend" aria-label="Friend's profile" className={`${hit} -ms-2`}>
            <Avatar who="her" name={partner?.name ?? '+'} src={partner?.avatar} className={partner ? '' : 'opacity-50'} />
          </NextLink>
          <NextLink href="/settings" aria-label="Settings" className={`${hit} text-primary`}>
            <GearAlt className="text-[22px]" />
          </NextLink>
        </span>
      }
    />
    <PairSheet opened={pairOpen} onClose={() => setPairOpen(false)} />
    </>
  );
}

/**
 * Inner screen header: "‹ Parent section" back link + title.
 * `back` overrides where it goes ({ label, href }); `large={false}` gives a compact bar (chat).
 */
export function InnerNavbar({ title, back, large = true, subnavbar, right }) {
  const router = useRouter();
  const pathname = usePathname();
  const parent = useParentSection();
  const lastMain = useLastMainScreen();
  const history = useBack();
  // Go back to the screen I really came from; without history, to the section (or the last main screen).
  const target = back ?? history.back ?? (parent.href === pathname ? lastMain : parent);

  // Let the next screen call this one by its real name ("‹ Bobby", "‹ Milan").
  const { setTitle } = history;
  useEffect(() => {
    if (typeof title === 'string' && title) setTitle(pathname, title);
  }, [title, pathname, setTitle]);
  return (
    <Navbar
      large={large}
      centerTitle={!large}
      title={title}
      subnavbar={subnavbar}
      right={right}
      left={
        <NavbarBackLink
          showText
          text={target.label}
          onClick={() => router.push(target.href, { transitionTypes: ['nav-back'] })}
        />
      }
    />
  );
}
