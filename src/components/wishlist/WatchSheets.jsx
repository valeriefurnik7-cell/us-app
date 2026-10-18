'use client';

import { useEffect, useState } from 'react';
import { Link, Preloader, Segmented, SegmentedButton, Sheet, Toolbar } from 'konsta/react';
import { Plus, Search, StarFill } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { Poster } from './WatchTab';
import { WATCH_STATUSES, addWatchItem, saveProgress, searchTitles, updateWatchItem } from '@/lib/wishlist';

// ───────────── Add ─────────────

function AddForm({ onClose }) {
  const { me, pair } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [adding, setAdding] = useState(null);

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

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <span className="ps-2 text-body font-semibold">Add to watch</span>
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
      </Toolbar>
      <div className="h-[70vh] overflow-auto pb-safe-8">
        <label className="mx-4 mt-2 flex h-10 items-center gap-2 rounded-control bg-surface-2 px-3">
          <Search className="text-[16px] text-text-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Movie or series title"
            className="h-full min-w-0 flex-1 bg-transparent text-body outline-none"
          />
        </label>
        <ul className="mx-4 mt-3 space-y-2">
          {query.trim().length >= 2 &&
            (results ?? []).map((r) => (
              <li key={r.key}>
                <button type="button" onClick={() => add(r)} disabled={Boolean(adding)} className="flex w-full items-center gap-3 rounded-card bg-surface p-2.5 text-start">
                  <Poster src={r.poster_url} type={r.type} className="h-[72px] w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold">{r.title}</span>
                    <span className="block truncate text-subhead text-text-secondary">{[r.genre, r.subtitle].filter(Boolean).join(' · ')}</span>
                  </span>
                  {adding === r.key ? <Preloader className="h-5! w-5!" /> : <Plus className="text-[20px] text-primary" />}
                </button>
              </li>
            ))}
          {query.trim().length >= 2 && (
            <li className="flex gap-2">
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
            </li>
          )}
        </ul>
      </div>
    </>
  );
}

export function WatchAddSheet({ opened, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={() => onClose(false)} className="w-full">
      {opened && <AddForm onClose={onClose} />}
    </Sheet>
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
                  <span className="flex-1 text-body">
                    Season {p?.season ?? 1} · Episode {p?.episode ?? 0}
                  </span>
                  {who.id === me.id && (
                    <span className="flex gap-1">
                      <button type="button" onClick={() => save({ season: (p?.season ?? 1) + 1, episode: 0 })} className="h-9 rounded-full bg-surface-2 px-3 text-subhead">
                        + season
                      </button>
                      <button type="button" onClick={() => save({ season: p?.season ?? 1, episode: (p?.episode ?? 0) + 1 })} className="h-9 rounded-full bg-accent px-3 text-subhead font-semibold text-white">
                        + episode
                      </button>
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
