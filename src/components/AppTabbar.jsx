'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import NextLink from '@/components/AppLink';
import { usePathname, useRouter } from 'next/navigation';
import { Tabbar, TabbarLink } from 'konsta/react';
import { TABBAR_SCREENS, TABS, tabForPath } from '@/lib/tabs';
import { useParentSection } from './AppShell';
import { useSession } from './SessionProvider';
import { useTabBadges } from '@/lib/badges';

// iOS 26 floating pill, built from Konsta's own glass tokens.
// Strong blur + a thinner tint so what scrolls underneath reads as frosted glass.
const GLASS =
  'gap-0! p-1 rounded-full backdrop-blur-[28px] backdrop-saturate-[1.8] bg-white/55 dark:bg-[rgb(40_40_44/0.45)] shadow-ios-light-glass dark:shadow-ios-dark-glass';

// Glass lens that slides under the active tab, with a slight overshoot like iOS.
// While dragged it grows a little and follows the finger without easing.
const INDICATOR =
  'pointer-events-none absolute top-1 bottom-1 left-0 rounded-full opacity-0 bg-white/60 dark:bg-white/12 backdrop-blur-md shadow-ios-light-glass-thumb dark:shadow-ios-dark-glass-thumb data-[ready]:opacity-100 data-[animate]:transition-[translate,width,scale] data-[animate]:duration-300 data-[animate]:ease-[cubic-bezier(0.34,1.36,0.64,1)] data-[dragging]:scale-110';

const DRAG_THRESHOLD = 8;

function scrollPageToTop() {
  document.querySelector('.k-page')?.scrollTo({ top: 0, behavior: 'smooth' });
}

const linksOf = (indicator) => [...indicator.parentElement.querySelectorAll(':scope > a')];

export default function AppTabbar() {
  const pathname = usePathname();
  const router = useRouter();
  const parent = useParentSection();
  // Inner screens (profile, settings) keep their parent tab highlighted.
  const highlighted = tabForPath(pathname) ?? parent;
  // Only the five main screens show the tabbar; deeper screens go back with ‹, like iOS.
  const onTabRoot = TABBAR_SCREENS.has(pathname);
  const activeIndex = TABS.indexOf(highlighted);
  const indicatorRef = useRef(null);
  const drag = useRef(null);
  const suppressNextClick = useRef(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const shownIndex = hoverIndex ?? activeIndex;
  const { partner } = useSession();
  const badges = useTabBadges(partner?.id, highlighted?.href);

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const place = () => {
      const link = linksOf(indicator)[activeIndex];
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

  // Drag the lens across the tabs; release opens the tab under it.
  function onPointerDown(e) {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const links = linksOf(indicator);
    drag.current = {
      x: e.clientX,
      pointerId: e.pointerId,
      links,
      startLeft: links[activeIndex]?.offsetLeft ?? 0,
      width: links[activeIndex]?.offsetWidth ?? 0,
      moved: false,
      index: activeIndex,
    };
  }

  function onPointerMove(e) {
    const d = drag.current;
    const indicator = indicatorRef.current;
    if (!d || !indicator) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      d.moved = true;
      e.currentTarget.setPointerCapture(d.pointerId);
      delete indicator.dataset.animate;
      indicator.dataset.dragging = '';
    }
    const last = d.links.at(-1);
    const max = last.offsetLeft + last.offsetWidth - d.width;
    const left = Math.min(Math.max(d.startLeft + dx, d.links[0].offsetLeft), max);
    indicator.style.translate = `${left}px 0`;
    const center = left + d.width / 2;
    const index = d.links.findIndex((l) => center >= l.offsetLeft && center < l.offsetLeft + l.offsetWidth);
    if (index !== -1 && index !== d.index) {
      d.index = index;
      setHoverIndex(index);
    }
  }

  function onPointerUp() {
    const d = drag.current;
    const indicator = indicatorRef.current;
    drag.current = null;
    if (!d?.moved || !indicator) return;
    // Swallow the click that follows the drag.
    suppressNextClick.current = true;
    indicator.dataset.animate = '';
    delete indicator.dataset.dragging;
    const link = d.links[d.index];
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.translate = `${link.offsetLeft}px 0`;
    setHoverIndex(null);
    if (d.index !== activeIndex) router.push(TABS[d.index].href, { transitionTypes: ['tab'] });
  }

  return (
    <Tabbar
      labels
      icons
      // Sits lower than Konsta's default (safe area + 16px), closer to the home indicator like iOS 26.
      className="app-bottom-bar fixed bottom-0 left-0 touch-pan-y pb-[max(8px,calc(var(--k-safe-area-bottom)-6px))]!"
      data-hidden={onTabRoot ? undefined : ''}
      style={{ viewTransitionName: 'tabbar' }}
      innerClassName={GLASS}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (suppressNextClick.current) {
          suppressNextClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <span ref={indicatorRef} className={INDICATOR} aria-hidden />
      {TABS.map((tab, i) => {
        const active = i === shownIndex;
        const Icon = active ? tab.iconActive : tab.icon;
        return (
          <TabbarLink
            key={tab.href}
            component={NextLink}
            href={tab.href}
            active={active}
            label={tab.label}
            className="rounded-full px-2!"
            draggable={false}
            onClick={(e) => {
              if (pathname === tab.href) {
                e.preventDefault();
                scrollPageToTop();
              }
            }}
            icon={
              <span className="relative flex items-center justify-center">
                {tab.accent ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <Icon className="text-[22px]" />
                  </span>
                ) : (
                  <Icon className="text-[26px]" />
                )}
                {/* Something new from her since I last opened this tab */}
                {badges[tab.href] && <span className="absolute -end-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-danger" />}
              </span>
            }
          />
        );
      })}
    </Tabbar>
  );
}
