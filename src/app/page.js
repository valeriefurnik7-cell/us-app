'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel } from 'konsta/react';
import {
  CalendarBadgePlus,
  ChevronRight,
  CloudBoltFill,
  CloudFill,
  CloudFogFill,
  CloudMoonFill,
  CloudRainFill,
  CloudSnowFill,
  CloudSunFill,
  MoonStarsFill,
  PaintbrushFill,
  SunMaxFill,
} from 'framework7-icons/react';
import Screen from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import InviteCard from '@/components/InviteCard';
import { useSession } from '@/components/SessionProvider';
import { useTheme } from '@/components/ThemeProvider';
import { describeActivity, localTime, timeDifference, useHome, useNow, useWeather, weatherKind } from '@/lib/home';
import { timeAgo } from '@/lib/dates';
import { startOfDay } from '@/lib/events';

const ICON = 'text-[16px]';
const WEATHER_ICONS = {
  sun: <SunMaxFill className={ICON} />,
  moon: <MoonStarsFill className={ICON} />,
  cloudSun: <CloudSunFill className={ICON} />,
  cloudMoon: <CloudMoonFill className={ICON} />,
  cloud: <CloudFill className={ICON} />,
  fog: <CloudFogFill className={ICON} />,
  rain: <CloudRainFill className={ICON} />,
  snow: <CloudSnowFill className={ICON} />,
  storm: <CloudBoltFill className={ICON} />,
};

function Person({ profile, who, now }) {
  const weather = useWeather(profile?.lat, profile?.lon);
  return (
    <NextLink href={who === 'me' ? '/profile/me' : '/profile/friend'} className="flex flex-1 flex-col items-center gap-1 text-center">
      <Avatar who={who} name={profile?.name ?? '+'} src={profile?.avatar} size="md" className={profile ? '' : 'opacity-50'} />
      <p className="mt-1 text-subhead font-semibold">{profile?.name ?? 'Waiting…'}</p>
      {profile?.city ? (
        <>
          <p className="text-caption text-text-secondary">{profile.city}</p>
          <p className="text-title font-bold tabular-nums">{localTime(now, profile.timezone)}</p>
          {weather && (
            <p className="flex items-center gap-1 text-subhead text-text-secondary">
              {WEATHER_ICONS[weatherKind(weather.code, weather.day)]}
              {weather.temp}°
            </p>
          )}
        </>
      ) : (
        profile && <p className="text-caption text-primary">Add your city</p>
      )}
    </NextLink>
  );
}

function UsCard() {
  const { me, partner, pair } = useSession();
  const { mode, setMode } = useTheme();
  const now = useNow();
  const [themeMenu, setThemeMenu] = useState(false);
  const diff = partner && timeDifference(now, me.timezone, partner.timezone, partner.name);

  return (
    <section className="relative mx-4 mt-2 rounded-card bg-surface px-3 pt-4 pb-4">
      <button
        type="button"
        aria-label="Theme"
        onClick={() => setThemeMenu(true)}
        className="absolute end-2 top-2 flex h-11 w-11 items-center justify-center text-text-secondary"
      >
        <PaintbrushFill className="text-[18px]" />
      </button>
      <NextLink href="/settings" className="block text-center text-caption font-semibold tracking-wide text-text-secondary uppercase">
        {pair?.name}
      </NextLink>
      <div className="mt-3 flex">
        <Person profile={me} who="me" now={now} />
        <Person profile={partner} who="her" now={now} />
      </div>
      {diff && <p className="mt-3 text-center text-subhead text-primary">{diff}</p>}

      <Actions opened={themeMenu} onBackdropClick={() => setThemeMenu(false)}>
        <ActionsGroup>
          <ActionsLabel>Theme</ActionsLabel>
          {[
            ['dark', 'Dark'],
            ['light', 'Light'],
            ['system', 'Like my phone'],
          ].map(([id, label]) => (
            <ActionsButton
              key={id}
              bold={mode === id}
              onClick={() => {
                setMode(id);
                setThemeMenu(false);
              }}
            >
              {label}
              {mode === id ? ' ✓' : ''}
            </ActionsButton>
          ))}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setThemeMenu(false)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>
    </section>
  );
}

function Countdown({ meeting, loading }) {
  if (loading) return <div className="mx-4 mt-3 h-28 animate-pulse rounded-card bg-surface" />;
  if (!meeting) {
    return (
      <NextLink
        href="/plans"
        className="mx-4 mt-3 flex h-24 items-center justify-center gap-2 rounded-card border-2 border-dashed border-text-secondary/25 text-body font-semibold text-primary"
      >
        <CalendarBadgePlus className="text-[22px]" />
        Plan a meeting
      </NextLink>
    );
  }
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(meeting.start));
  const end = meeting.end ? startOfDay(new Date(meeting.end)) : start;
  const days = Math.round((start - today) / 864e5);
  const dates = (() => {
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return end > start ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
  })();
  const together = days <= 0;

  return (
    <NextLink href="/plans" className={`mx-4 mt-3 block rounded-card p-5 ${together ? 'bg-together text-black' : 'bg-surface'}`}>
      {together ? (
        <>
          <p className="text-large-title leading-tight font-bold">We meet today!</p>
          <p className="mt-1 text-body">{[meeting.title, meeting.city].filter(Boolean).join(' · ')}</p>
        </>
      ) : (
        <>
          <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Until we meet</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[56px] leading-none font-bold text-together tabular-nums">{days}</span>
            <span className="text-title font-semibold">{days === 1 ? 'day' : 'days'}</span>
          </p>
          <p className="mt-2 text-subhead text-text-secondary">{[meeting.city ?? meeting.title, dates].filter(Boolean).join(' · ')}</p>
        </>
      )}
    </NextLink>
  );
}

function Counters({ counts }) {
  const items = [
    ['Meetings', counts?.meetings, '/plans'],
    ['Trips', counts?.trips, '/plans'],
    ['Pet photos', counts?.petPhotos, '/pets'],
  ];
  return (
    <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
      {items.map(([label, value, href]) => (
        <NextLink key={label} href={href} className="rounded-card bg-surface px-2 py-3 text-center">
          <p className="text-title font-bold tabular-nums">{value ?? '–'}</p>
          <p className="text-caption text-text-secondary">{label}</p>
        </NextLink>
      ))}
    </div>
  );
}

function Activity({ rows }) {
  const { me, partner } = useSession();
  const [items, setItems] = useState(null);
  const theirs = rows.filter((r) => r.actor_id !== me.id);
  const key = theirs.map((r) => r.id).join();

  useEffect(() => {
    let cancelled = false;
    describeActivity(theirs).then((list) => !cancelled && setItems(list.slice(0, 5)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rows are identified by their ids
  }, [key]);

  if (!partner) return null;
  return (
    <section className="mt-6">
      <h3 className="mx-8 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">From {partner.name}</h3>
      {items === null ? (
        <div className="mx-4 h-24 animate-pulse rounded-card bg-surface" />
      ) : items.length === 0 ? (
        <p className="mx-4 rounded-card bg-surface px-4 py-6 text-center text-subhead text-text-secondary">Nothing new from {partner.name} yet</p>
      ) : (
        <ul className="mx-4 overflow-hidden rounded-card bg-surface">
          {items.map((a) => (
            <li key={a.id}>
              <NextLink href={a.href} className="flex min-h-14 items-center gap-3 border-b border-text-secondary/15 px-3 py-2">
                <Avatar who="her" name={partner.name} src={partner.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block text-body">
                    <b className="font-semibold">{partner.name}</b> {a.text}
                  </span>
                  <span className="text-caption text-text-secondary">{timeAgo(a.created_at)}</span>
                </span>
                <ChevronRight className="shrink-0 text-[14px] text-text-secondary/60" />
              </NextLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function HomePage() {
  const home = useHome();
  return (
    <Screen>
      <AppNavbar title="Home" />
      <UsCard />
      <InviteCard />
      <Countdown meeting={home.data?.nextMeeting} loading={home.loading} />
      <Counters counts={home.data?.counts} />
      <Activity rows={home.data?.activity ?? []} />
    </Screen>
  );
}
