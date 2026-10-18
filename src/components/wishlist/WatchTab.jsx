'use client';

import { useRef, useState } from 'react';
import { Chip } from 'konsta/react';
import { Ellipsis, Film, PinFill, Plus, Search, Shuffle, Tv } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { EmptyState } from '../Screen';
import { useSession } from '../SessionProvider';
import { WATCH_STATUSES } from '@/lib/wishlist';

export function Poster({ src, type, className = '' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-2 text-text-secondary ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : type === 'series' ? (
        <Tv className="text-[24px]" />
      ) : (
        <Film className="text-[24px]" />
      )}
    </span>
  );
}

/** "Can't decide": flicks through the want-to-watch list and lands on one. */
function RandomPick({ items, onOpen }) {
  const [shown, setShown] = useState(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef(null);

  function roll() {
    if (!items.length || rolling) return;
    setRolling(true);
    let step = 0;
    const steps = 14 + Math.floor(Math.random() * items.length);
    const tick = () => {
      setShown(items[step % items.length]);
      step += 1;
      if (step <= steps) timer.current = setTimeout(tick, 40 + step * 12);
      else setRolling(false);
    };
    tick();
  }

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 rounded-card bg-surface p-3">
      <Poster src={shown?.poster_url} type={shown?.type} className="h-20 w-14" />
      <button type="button" disabled={rolling || !shown} onClick={() => shown && onOpen(shown)} className="min-w-0 flex-1 text-start">
        <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Random pick</p>
        <p className={`truncate text-body font-semibold ${rolling ? 'opacity-60' : ''}`}>{shown?.title ?? 'Can’t decide what to watch?'}</p>
        {shown && !rolling && <p className="truncate text-subhead text-text-secondary">{[shown.genre, shown.type === 'series' ? 'Series' : 'Movie'].filter(Boolean).join(' · ')}</p>}
      </button>
      <button
        type="button"
        onClick={roll}
        disabled={!items.length}
        aria-label="Pick a random title"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
      >
        <Shuffle className="text-[20px]" />
      </button>
    </div>
  );
}

function FilterChips({ options, value, onChange }) {
  return options.map((o) => (
    <Chip
      key={o.id}
      component="button"
      onClick={() => onChange(value === o.id ? null : o.id)}
      className={`h-8 shrink-0 px-3 text-subhead ${value === o.id ? 'bg-accent! text-white!' : ''}`}
    >
      {o.label}
    </Chip>
  ));
}

function WatchCard({ item, onOpen, onMenu }) {
  const { me, partner } = useSession();
  const mine = item.added_by === me.id;
  const author = mine ? me : partner;
  const status = WATCH_STATUSES.find((s) => s.id === item.status)?.label;
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface p-2.5">
      <button type="button" onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
        <Poster src={item.poster_url} type={item.type} className="h-[84px] w-14" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-body font-semibold">
            {item.pinned && <PinFill className="shrink-0 text-[13px] text-primary" />}
            <span className="truncate">{item.title}</span>
          </span>
          <span className="block truncate text-subhead text-text-secondary">
            {[item.genre, item.type === 'series' ? 'Series' : 'Movie'].filter(Boolean).join(' · ')}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-caption text-text-secondary">
            <Avatar who={mine ? 'me' : 'her'} name={author?.name} src={author?.avatar} className="h-5! w-5! text-[10px]!" />
            {status}
          </span>
        </span>
      </button>
      <button type="button" aria-label="More" onClick={() => onMenu(item)} className="flex h-11 w-9 shrink-0 items-center justify-center text-text-secondary">
        <Ellipsis className="text-[20px]" />
      </button>
    </div>
  );
}

export default function WatchTab({ items, loading, onOpen, onMenu, onAdd }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState(null);
  const [status, setStatus] = useState(null);
  const [genre, setGenre] = useState(null);

  const genres = [...new Set(items.map((i) => i.genre).filter(Boolean))].sort();
  const filtered = items
    .filter((i) => !query.trim() || i.title.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((i) => !type || i.type === type)
    .filter((i) => !status || i.status === status)
    .filter((i) => !genre || i.genre === genre)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <>
      {/* Controls only make sense once there is something to pick from. */}
      {items.length > 0 && (
        <>
          <button
            type="button"
            onClick={onAdd}
            className="mx-4 mt-3 flex h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-card border-2 border-dashed border-text-secondary/25 text-body font-semibold text-primary"
          >
            <Plus className="text-[18px]" />
            Add a movie or series
          </button>

          <RandomPick items={items.filter((i) => i.status === 'want')} onOpen={onOpen} />

          <label className="mx-4 mt-3 flex h-10 items-center gap-2 rounded-control bg-surface-2 px-3">
            <Search className="text-[16px] text-text-secondary" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-full min-w-0 flex-1 bg-transparent text-body outline-none" />
          </label>

          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4">
            <FilterChips options={[{ id: 'movie', label: 'Movies' }, { id: 'series', label: 'Series' }]} value={type} onChange={setType} />
            <FilterChips options={WATCH_STATUSES.map((s) => ({ id: s.id, label: s.label.replace(' to watch', '') }))} value={status} onChange={setStatus} />
            <FilterChips options={genres.map((g) => ({ id: g, label: g }))} value={genre} onChange={setGenre} />
          </div>
        </>
      )}

      {loading ? (
        <div className="mx-4 mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing to watch yet" text="Movies and series you want to watch together" actionLabel="Add a movie" onAction={onAdd} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing matches" />
      ) : (
        <div className="mx-4 mt-3 space-y-2">
          {filtered.map((item) => (
            <WatchCard key={item.id} item={item} onOpen={onOpen} onMenu={onMenu} />
          ))}
        </div>
      )}
    </>
  );
}
