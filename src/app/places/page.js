'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Segmented, SegmentedButton } from 'konsta/react';
import { HeartFill, MapPin, StarFill } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import { useSession } from '@/components/SessionProvider';
import PlaceSheet from '@/components/places/PlaceSheet';
import PlaceDetail from '@/components/places/PlaceDetail';
import { CATEGORIES, usePlaces } from '@/lib/places';

// Leaflet touches `window`, so the map loads only in the browser.
const PlacesMap = dynamic(() => import('@/components/places/PlacesMap'), { ssr: false });

const sameCity = (a, b) => a && b && a.trim().toLowerCase() === b.trim().toLowerCase();

function PlaceCard({ place, onOpen }) {
  const { me, partner } = useSession();
  const mine = place.added_by === me.id;
  const author = mine ? me : partner;
  const category = CATEGORIES.find((c) => c.id === place.category)?.label;
  const ratings = Object.values(place.visit?.ratings ?? {}).map((r) => r.rating).filter(Boolean);
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  return (
    <button type="button" onClick={() => onOpen(place)} className="flex w-full items-center gap-3 rounded-card bg-surface p-2.5 text-start">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2 text-text-secondary">
        {place.image_urlSrc || place.visit?.photoSrcs?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.image_urlSrc ?? place.visit.photoSrcs[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <MapPin className="text-[24px]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold">{place.title}</span>
        <span className="block truncate text-subhead text-text-secondary">{[category, place.city].filter(Boolean).join(' · ')}</span>
        <span className="mt-1 flex items-center gap-2 text-caption text-text-secondary">
          <Avatar who={mine ? 'me' : 'her'} name={author?.name} src={author?.avatar} className="h-5! w-5! text-[10px]!" />
          {place.likes.length > 0 && (
            <span className="flex items-center gap-0.5 text-danger">
              <HeartFill className="text-[12px]" />
              both
            </span>
          )}
          {avg && (
            <span className="flex items-center gap-0.5 text-together">
              <StarFill className="text-[12px]" />
              {avg}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function Chips({ options, value, onChange }) {
  return options.map((o) => (
    <button
      key={o.id}
      type="button"
      onClick={() => onChange(value === o.id ? null : o.id)}
      className={`h-8 shrink-0 rounded-full px-3 text-subhead ${value === o.id ? 'bg-accent text-white' : 'bg-surface-2'}`}
    >
      {o.label}
    </button>
  ));
}

export default function PlacesPage() {
  const { me, partner } = useSession();
  const places = usePlaces();
  const [tab, setTab] = useState('want');
  const [view, setView] = useState('list');
  const [city, setCity] = useState(null);
  const [category, setCategory] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // { place } | null
  const openPlace = useCallback((p) => setOpenId(p.id), []);

  const all = places.data ?? [];
  const filtered = all
    .filter((p) => (tab === 'been' ? p.visit : !p.visit))
    .filter((p) => !category || p.category === category)
    .filter((p) => {
      if (city === 'mine') return sameCity(p.city, me.city);
      if (city === 'hers') return sameCity(p.city, partner?.city);
      if (city === 'other') return !sameCity(p.city, me.city) && !sameCity(p.city, partner?.city);
      return true;
    });

  // Grouped by city, the cities with the most places first.
  const groups = Object.entries(
    filtered.reduce((acc, p) => {
      const key = p.city || 'Somewhere';
      (acc[key] ??= []).push(p);
      return acc;
    }, {})
  ).sort((a, b) => b[1].length - a[1].length);

  const cityOptions = [
    { id: 'mine', label: me.city ? `My city · ${me.city}` : 'My city' },
    { id: 'hers', label: partner?.city ? `Her city · ${partner.city}` : 'Her city' },
    { id: 'other', label: 'Other' },
  ];

  return (
    <Screen>
      <AppNavbar title="Places" onAdd={() => setEditing({ place: null })} />

      <div className="mx-4 mt-2 flex gap-2">
        <div className="flex-1">
          <Segmented strong rounded>
            <SegmentedButton strong rounded active={tab === 'want'} onClick={() => setTab('want')}>
              Want to go
            </SegmentedButton>
            <SegmentedButton strong rounded active={tab === 'been'} onClick={() => setTab('been')}>
              Been
            </SegmentedButton>
          </Segmented>
        </div>
        <div className="w-28">
          <Segmented rounded>
            <SegmentedButton rounded small active={view === 'list'} onClick={() => setView('list')}>
              List
            </SegmentedButton>
            <SegmentedButton rounded small active={view === 'map'} onClick={() => setView('map')}>
              Map
            </SegmentedButton>
          </Segmented>
        </div>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        <Chips options={cityOptions} value={city} onChange={setCity} />
      </div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
        <Chips options={CATEGORIES} value={category} onChange={setCategory} />
      </div>

      {places.loading ? (
        <div className="mx-4 mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[84px] animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : view === 'map' ? (
        <PlacesMap places={filtered} onOpen={openPlace} />
      ) : filtered.length === 0 ? (
        tab === 'been' ? (
          <EmptyState title="No visited places yet" text="Open a place and tap “We were there”" />
        ) : (
          <EmptyState
            title="No places yet"
            text="Where to go when you meet — paste a Google Maps link or search by name"
            actionLabel="Add a place"
            onAction={() => setEditing({ place: null })}
          />
        )
      ) : (
        groups.map(([name, list]) => (
          <section key={name}>
            <h3 className="mx-8 mt-5 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">
              {name} · {list.length}
            </h3>
            <div className="mx-4 space-y-2">
              {list.map((p) => (
                <PlaceCard key={p.id} place={p} onOpen={openPlace} />
              ))}
            </div>
          </section>
        ))
      )}

      <PlaceSheet
        opened={Boolean(editing)}
        place={editing?.place ?? null}
        onClose={(changed) => {
          setEditing(null);
          if (changed) places.reload();
        }}
      />
      <PlaceDetail
        place={all.find((p) => p.id === openId) ?? null}
        onEdit={(place) => {
          setOpenId(null);
          setEditing({ place });
        }}
        onClose={(changed, keepOpen) => {
          if (!keepOpen) setOpenId(null);
          if (changed) places.reload();
        }}
      />
    </Screen>
  );
}
