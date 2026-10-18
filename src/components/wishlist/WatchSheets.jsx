'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, Navbar, Page, Popup, Preloader, Segmented, SegmentedButton, Sheet, Toolbar } from 'konsta/react';
import { Plus, Search, StarFill } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { Poster } from './WatchTab';
import { WATCH_STATUSES, addWatchItem, saveProgress, searchTitles, updateWatchItem } from '@/lib/wishlist';
import { recommendations } from '@/lib/recommend';

// ───────────── Add ─────────────

/** Poster card used for search results and recommendations. */
function TitleCard({ item, adding, onAdd }) {
  return (
    <button type="button" onClick={() => onAdd(item)} disabled={Boolean(adding)} className="min-w-0 text-start">
      <span className="relative block aspect-[2/3] overflow-hidden rounded-control bg-surface-2">
        <Poster src={item.poster_url} type={item.type} className="h-full w-full" />
        <span className="absolute end-1.5 bottom-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow">
          {adding === item.key ? <Preloader className="h-4! w-4! text-white" /> : <Plus className="text-[16px]" />}
        </span>
      </span>
      <span className="mt-1.5 line-clamp-2 block text-subhead leading-tight font-semibold">{item.title}</span>
      <span className="block truncate text-caption text-text-secondary">{item.reason ?? [item.genre, item.subtitle].filter(Boolean).join(' · ')}</span>
    </button>
  );
}

function AddForm({ items, onClose }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [picks, setPicks] = useState(null);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    // Focus without letting iOS scroll the page underneath.
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 350);
    let cancelled = false;
    recommendations(items)
      .then((r) => !cancelled && setPicks(r))
      .catch(() => !cancelled && setPicks([]));
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [items]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchTitles(query.trim(), controller.signal)
        .then(setResults)
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function add(item) {
    setAdding(item.key);
    await addWatchItem(item, { me, pair });
    onClose(true);
  }

  const searching = query.trim().length >= 2;

  return (
    <Page>
      <Navbar
        title="Add to watch"
        right={
          <Link onClick={() => onClose(false)}>
            <b>Done</b>
          </Link>
        }
        subnavbar={
          <label className="flex h-10 w-full items-center gap-2 rounded-control bg-surface-2 px-3">
            <Search className="text-[16px] text-text-secondary" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Movie or series title"
              className="h-full min-w-0 flex-1 bg-transparent text-body outline-none"
            />
          </label>
        }
      />
      <div className="px-4 pb-safe-8">
        {searching ? (
          <>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 pt-3">
              {(results ?? []).map((r) => (
                <TitleCard key={r.key} item={r} adding={adding} onAdd={add} />
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              {['movie', 'series'].map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={Boolean(adding)}
                  onClick={() => add({ key: `manual-${type}`, title: query.trim(), type })}
                  className="h-11 flex-1 rounded-card border border-dashed border-text-secondary/30 text-subhead text-primary"
                >
                  Add “{query.trim()}” as {type === 'movie' ? 'movie' : 'series'}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-3 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">For you two</h3>
            {picks === null ? (
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="aspect-[2/3] animate-pulse rounded-control bg-surface-2" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                {picks.map((r) => (
                  <TitleCard key={r.key} item={r} adding={adding} onAdd={add} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  );
}

/** Full-screen, so the keyboard can't push a half sheet around. */
export function WatchAddSheet({ opened, items = [], onClose }) {
  return (
    <Popup opened={opened} onBackdropClick={() => onClose(false)}>
      {opened && <AddForm items={items} onClose={onClose} />}
    </Popup>
  );
}

// ───────────── Detail ─────────────

const position = (p) => (p?.season ?? 1) * 1000 + (p?.episode ?? 0);

function aheadHint(mine, hers, partnerName) {
  if (!mine?.episode && !hers?.episode) return null;
  const diff = position(mine) - position(hers);
  if (diff === 0) return 'You’re on the same episode';
  const sameSeason = (mine?.season ?? 1) === (hers?.season ?? 1);
  const amount = sameSeason ? `${Math.abs(diff)} episode${Math.abs(diff) === 1 ? '' : 's'}` : 'a season or more';
  return diff > 0 ? `You’re ahead by ${amount}` : `${partnerName} is ahead by ${amount}`;
}

/** − value + ; step back as easily as forward. */
function Stepper({ label, value, min, onChange }) {
  return (
    <span className="flex h-9 items-center rounded-full bg-surface-2">
      <button type="button" aria-label={`${label} minus`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex h-9 w-9 items-center justify-center text-title disabled:opacity-30">
        −
      </button>
      <span className="min-w-12 text-center text-subhead font-semibold tabular-nums">
        {label} {value}
      </span>
      <button type="button" aria-label={`${label} plus`} onClick={() => onChange(value + 1)} className="flex h-9 w-9 items-center justify-center text-title text-primary">
        +
      </button>
    </span>
  );
}

function Stars({ value, onChange }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n === value ? null : n)}
          className={`flex h-9 w-8 items-center justify-center ${n <= (value ?? 0) ? 'text-together' : 'text-text-secondary/30'}`}
        >
          <StarFill className="text-[22px]" />
        </button>
      ))}
    </span>
  );
}

function Detail({ item, onClose }) {
  const { me, partner } = useSession();
  const mine = item.progress.find((p) => p.profile_id === me.id);
  const hers = item.progress.find((p) => p.profile_id !== me.id);
  const [review, setReview] = useState(mine?.review ?? '');
  const save = async (patch) => {
    await saveProgress(item.id, me, patch);
    onClose(true, true);
  };

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-end">
        <Link toolbar onClick={() => onClose(false)}>
          <b>Done</b>
        </Link>
      </Toolbar>
      <div className="max-h-[80vh] overflow-auto pb-safe-8">
        <div className="flex gap-4 px-4">
          <Poster src={item.poster_url} type={item.type} className="h-36 w-24" />
          <div className="min-w-0 pt-1">
            <p className="text-title font-bold">{item.title}</p>
            <p className="text-subhead text-text-secondary">{[item.genre, item.type === 'series' ? 'Series' : 'Movie'].filter(Boolean).join(' · ')}</p>
          </div>
        </div>

        <div className="mx-4 mt-4">
          <Segmented strong rounded>
            {WATCH_STATUSES.map((s) => (
              <SegmentedButton
                key={s.id}
                strong
                rounded
                small
                active={item.status === s.id}
                onClick={async () => {
                  await updateWatchItem(item.id, { status: s.id });
                  onClose(true, true);
                }}
              >
                {s.label.replace(' to watch', '')}
              </SegmentedButton>
            ))}
          </Segmented>
        </div>

        {item.type === 'series' && (
          <section className="mx-4 mt-4 rounded-card bg-surface p-4">
            <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Where we are</p>
            {[
              [me, mine, 'me'],
              [partner, hers, 'her'],
            ].map(([who, p, color]) =>
              who ? (
                <div key={who.id} className="mt-3 flex items-center gap-3">
                  <Avatar who={color} name={who.name} src={who.avatar} />
                  {who.id === me.id ? (
                    <span className="flex flex-1 flex-wrap items-center gap-2">
                      <Stepper
                        label="S"
                        value={p?.season ?? 1}
                        min={1}
                        onChange={(season) => save({ season, episode: season > (p?.season ?? 1) ? 0 : p?.episode ?? 0 })}
                      />
                      <Stepper label="E" value={p?.episode ?? 0} min={0} onChange={(episode) => save({ season: p?.season ?? 1, episode })} />
                      {(p?.episode ?? 0) > 0 && (
                        <button type="button" onClick={() => save({ season: 1, episode: 0 })} className="h-9 px-1 text-subhead text-danger">
                          Reset
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="flex-1 text-body">
                      Season {p?.season ?? 1} · Episode {p?.episode ?? 0}
                    </span>
                  )}
                </div>
              ) : null
            )}
            {partner && <p className="mt-3 text-subhead text-primary">{aheadHint(mine, hers, partner.name)}</p>}
          </section>
        )}

        {item.status === 'watched' && (
          <section className="mx-4 mt-4 rounded-card bg-surface p-4">
            <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Ratings</p>
            <div className="mt-2 flex items-center gap-3">
              <Avatar who="me" name={me.name} src={me.avatar} />
              <Stars value={mine?.rating} onChange={(rating) => save({ rating })} />
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              onBlur={() => review !== (mine?.review ?? '') && save({ review: review.trim() || null })}
              placeholder="Your short review"
              rows={2}
              className="mt-2 w-full resize-none rounded-control bg-surface-2 px-3 py-2 text-body outline-none"
            />
            {partner && (
              <div className="mt-3 flex items-start gap-3">
                <Avatar who="her" name={partner.name} src={partner.avatar} />
                <div>
                  <Stars value={hers?.rating} />
                  {hers?.review && <p className="mt-1 text-body">{hers.review}</p>}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

/** onClose(changed, keepOpen) */
export function WatchDetailSheet({ item, onClose }) {
  return (
    <Sheet opened={Boolean(item)} onBackdropClick={() => onClose(false)} className="w-full">
      {item && <Detail key={item.id} item={item} onClose={onClose} />}
    </Sheet>
  );
}
