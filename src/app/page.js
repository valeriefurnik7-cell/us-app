'use client';

import { useEffect, useState } from 'react';
import NextLink from '@/components/AppLink';
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
  HeartFill,
  MoonStarsFill,
  PaintbrushFill,
  SunMaxFill,
} from 'framework7-icons/react';
import Screen from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import InviteCard from '@/components/InviteCard';
import { useSession } from '@/components/SessionProvider';
import AppearanceSheet from '@/components/AppearanceSheet';
import { parseTheme } from '@/lib/appearance';
import { signedUrls } from '@/lib/media';
import { distanceKm, localHour, localTime, timeDifference, useHome, useNow, useUpdates, useWeather, weatherKind } from '@/lib/home';
import UpdatesFeed from '@/components/UpdatesFeed';
import TrophyCard from '@/components/pets/TrophyCard';
import { usePetsOfDay } from '@/lib/petOfDay';
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

/** One side of the Us card: avatar, city, local time with day/night, weather. */
function Person({ profile, who, now, onPhoto }) {
  const weather = useWeather(profile?.lat, profile?.lon);
  const hour = profile?.timezone ? localHour(now, profile.timezone) : null;
  const night = hour !== null && (hour < 7 || hour >= 21);
  return (
    <NextLink href={who === 'me' ? '/profile/me' : '/profile/friend'} className="relative z-10 flex flex-1 flex-col items-center text-center">
      <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${who === 'me' ? 'bg-me/25' : 'bg-her/25'}`}>
        <Avatar who={who} name={profile?.name ?? '+'} src={profile?.avatar} size="lg" className={`h-[72px]! w-[72px]! ${profile ? '' : 'opacity-50'}`} />
      </span>
      <p className="mt-2 text-body font-bold">{profile?.name ?? 'Waiting…'}</p>
      {profile?.city ? (
        <>
          <p className="text-caption text-text-secondary">{profile.city}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[28px] leading-none font-bold tabular-nums">
            {localTime(now, profile.timezone)}
          </p>
          <p className={`mt-1.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${onPhoto ? 'bg-black/30' : 'bg-surface-2'}`}>
            {night ? <MoonStarsFill className="text-[12px]" /> : <SunMaxFill className="text-[12px] text-together" />}
            {night ? 'Night' : 'Day'}
            {weather && (
              <>
                <span className="opacity-40">·</span>
                {WEATHER_ICONS[weatherKind(weather.code, weather.day)]}
                {weather.temp}°
              </>
            )}
          </p>
        </>
      ) : (
        profile && <p className="mt-1 text-caption text-primary">Add your city</p>
      )}
    </NextLink>
  );
}

function useCardPhoto(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    signedUrls([path]).then((urls) => !cancelled && setUrl(urls[path] ?? null));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return path ? url : null;
}

function UsCard() {
  const { me, partner, pair } = useSession();
  const now = useNow();
  const [lookOpen, setLookOpen] = useState(false);
  const photo = useCardPhoto(parseTheme(me).cardPhoto);
  const diff = partner && timeDifference(now, me.timezone, partner.timezone, partner.name);
  const km = distanceKm(me, partner);

  return (
    <section className={`relative mx-4 mt-2 overflow-hidden rounded-card px-3 pt-4 pb-4 ${photo ? 'text-white' : 'bg-surface'}`}>
      {photo && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* Scrim keeps names and clocks readable on any photo */}
          <span className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className={`relative ${photo ? '[&_.text-text-secondary]:text-white/80 [&_.text-primary]:text-white' : ''}`}>
        <button
          type="button"
          aria-label="Our look"
          onClick={() => setLookOpen(true)}
          className={`absolute -end-1 -top-2 flex h-11 w-11 items-center justify-center ${photo ? 'text-white' : 'text-text-secondary'}`}
        >
          <PaintbrushFill className="text-[18px]" />
        </button>
        <NextLink href="/settings" className="block text-center text-caption font-semibold tracking-wide text-text-secondary uppercase">
          {pair?.name}
        </NextLink>
        <div className="relative mt-4 flex">
          {/* The two of us, joined by a dotted line with the distance between our cities */}
          <span className="absolute inset-x-[25%] top-[38px] border-t-2 border-dashed border-text-secondary/35" />
          {km !== null && (
            <span className={`absolute top-[26px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-caption font-bold ${photo ? 'bg-black/40' : 'bg-surface-2'}`}>
              <HeartFill className="text-[11px] text-danger" />
              {km.toLocaleString('en-GB')} km
            </span>
          )}
          <Person profile={me} who="me" now={now} onPhoto={Boolean(photo)} />
          <Person profile={partner} who="her" now={now} onPhoto={Boolean(photo)} />
        </div>
        {diff && <p className="mt-3 text-center text-subhead font-semibold text-primary">{diff}</p>}
      </div>

      <AppearanceSheet opened={lookOpen} onClose={() => setLookOpen(false)} />
    </section>
  );
}

/** How much of the time between our last and next meeting is already behind us. */
function WaitBar({ from, to }) {
  const start = startOfDay(new Date(from.end ?? from.start)).getTime();
  const end = startOfDay(new Date(to.start)).getTime();
  const share = Math.min(1, Math.max(0, (startOfDay(new Date()).getTime() - start) / Math.max(1, end - start)));
  const since = new Date(from.end ?? from.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-together" style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
      <p className="mt-1.5 flex justify-between text-caption text-text-secondary">
        <span>
          Last time: {from.city ?? from.title}, {since}
        </span>
        <span>{Math.round(share * 100)}% of the wait done</span>
      </p>
    </div>
  );
}

function Countdown({ meeting, lastMeeting, loading }) {
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
          <p className="mt-2 text-caption opacity-70">Not a meeting? Open it in Plans and change the type.</p>
        </>
      ) : (
        <>
          <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Until we meet</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-[56px] leading-none font-bold text-together tabular-nums">{days}</span>
            <span className="text-title font-semibold">{days === 1 ? 'day' : 'days'}</span>
          </p>
          <p className="mt-2 text-subhead text-text-secondary">{[meeting.city ?? meeting.title, dates].filter(Boolean).join(' · ')}</p>
          {lastMeeting && <WaitBar from={lastMeeting} to={meeting} />}
        </>
      )}
    </NextLink>
  );
}

/** Last night's (or tonight's) Pet of the day, if there is a fresh one. */
function PetOfDay() {
  const winners = usePetsOfDay();
  const latest = winners.data?.[0];
  if (!latest) return null;
  const age = (startOfDay(new Date()) - new Date(`${latest.day}T00:00:00`)) / 864e5;
  if (age > 1) return null;
  return (
    <section className="mx-4 mt-3">
      <NextLink href="/pets/hall" className="block">
        <TrophyCard winner={latest} compact />
      </NextLink>
    </section>
  );
}

function Counters({ counts }) {
  const items = [
    ['Meetings', counts?.meetings, '/plans/meetings'],
    ['Trips', counts?.trips, '/plans?tab=trips'],
    ['Pet photos', counts?.petPhotos, '/pets/photos'],
  ];
  return (
    <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
      {items.map(([label, value, href]) => (
        <NextLink
          key={label}
          href={href}
          // Plans opens on the tab it remembers; point it at Trips before going there.
          onClick={() => {
            if (href.includes('tab=trips')) {
              try {
                sessionStorage.setItem('plansSegment', 'trips');
              } catch {}
            }
          }}
          className="rounded-card bg-surface px-2 py-3 text-center"
        >
          <p className="text-title font-bold tabular-nums">{value ?? '–'}</p>
          <p className="text-caption text-text-secondary">{label}</p>
        </NextLink>
      ))}
    </div>
  );
}

function Updates() {
  const updates = useUpdates(6);
  return (
    <section className="mt-6">
      <div className="mx-4 mb-1.5 flex items-center justify-between px-4">
        <h3 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Updates</h3>
        <NextLink href="/updates" className="flex h-9 items-center text-subhead text-primary">
          See all
        </NextLink>
      </div>
      <UpdatesFeed items={updates.data ?? []} loading={updates.loading} empty="Pet photos, wishes, plans and places you both add show up here" />
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
      <Counters counts={home.data?.counts} />
      <Countdown meeting={home.data?.nextMeeting} lastMeeting={home.data?.lastMeeting} loading={home.loading} />
      <PetOfDay />
      <Updates />
    </Screen>
  );
}
