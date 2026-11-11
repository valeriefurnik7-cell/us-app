'use client';

import { useState } from 'react';
import { Segmented, SegmentedButton } from 'konsta/react';
import { CheckmarkSealFill, Ellipsis, Gift, LockFill, Plus } from 'framework7-icons/react';
import { EmptyState } from '../Screen';
import { useSession } from '../SessionProvider';
import { formatPrice } from './GiftDetail';
import { GIFT_STATUSES } from '@/lib/wishlist';

const ALL = '__all';
const SECRET = '__secret';
const GIVING = '__giving';
const DONE = '__done';

/** Small tile in the lists row, like the counters on an Ohmywishes profile. */
function ListTile({ label, count, active, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[72px] w-28 shrink-0 flex-col justify-between rounded-card px-3 py-2.5 text-start transition-colors ${
        active ? 'bg-accent text-white' : 'bg-surface'
      }`}
    >
      <span className={`flex items-center gap-1 truncate text-caption leading-tight font-semibold ${active ? 'text-white/85' : 'text-text-secondary'}`}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="text-title leading-none font-bold tabular-nums">{count}</span>
    </button>
  );
}

/** Photo first, name and price underneath — no card chrome, like Ohmywishes. */
function WishCard({ gift, mine, onOpen, onMenu }) {
  const price = formatPrice(gift);
  const status = gift.reservation && GIFT_STATUSES.find((s) => s.id === gift.reservation.status);
  return (
    <div className="min-w-0">
      <div className="relative">
        <button type="button" onClick={() => onOpen(gift)} className="block aspect-[3/4] w-full overflow-hidden rounded-card bg-surface">
          {gift.image_urlSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gift.image_urlSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-text-secondary">
              <Gift className="text-[40px]" />
            </span>
          )}
        </button>
        {mine && (
          <button
            type="button"
            aria-label="More"
            onClick={() => onMenu(gift)}
            className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
          >
            <Ellipsis className="text-[16px]" />
          </button>
        )}
        {mine && gift.is_secret && (
          <span className="absolute start-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
            <LockFill className="text-[12px]" />
          </span>
        )}
        {(gift.fulfilled_at || status?.id === 'given') && (
          <span className="absolute bottom-2 start-2 flex items-center gap-1 rounded-full bg-together px-2.5 py-1 text-caption font-semibold text-black">
            <CheckmarkSealFill className="text-[12px]" />
            Came true
          </span>
        )}
        {status && status.id !== 'given' && (
          <span className="absolute start-2 top-2 rounded-full bg-accent px-2.5 py-1 text-caption font-semibold text-white">
            {status.id === 'reserved' ? 'You’re giving' : status.label}
          </span>
        )}
      </div>
      <button type="button" onClick={() => onOpen(gift)} className="mt-2 block w-full px-0.5 text-start">
        <span className="line-clamp-2 text-subhead leading-snug font-semibold">{gift.title}</span>
        {price && <span className="text-subhead text-text-secondary">{price}</span>}
      </button>
    </div>
  );
}

export default function GiftsTab({ gifts, loading, onOpen, onAdd, onMenu, jumpTo }) {
  const { me, partner } = useSession();
  const [whose, setWhose] = useState('mine');
  const [filter, setFilter] = useState(ALL);
  // After saving a wish, show the list it went into.
  const [lastJump, setLastJump] = useState(jumpTo);
  if (jumpTo && jumpTo !== lastJump) {
    setLastJump(jumpTo);
    setWhose('mine');
    setFilter(jumpTo.isSecret ? SECRET : jumpTo.list || ALL);
  }
  const [newList, setNewList] = useState(null);
  const [extraLists, setExtraLists] = useState([]); // lists created here before their first wish

  const mineView = whose === 'mine';
  const theirs = gifts.filter((g) => (mineView ? g.wisher_id === me.id : g.wisher_id !== me.id));
  const done = theirs.filter((g) => g.fulfilled_at || g.reservation?.status === 'given');
  const active = theirs.filter((g) => !g.fulfilled_at && g.reservation?.status !== 'given');
  const lists = [...new Set([...active.map((g) => g.list).filter(Boolean), ...(mineView ? extraLists : [])])].sort();

  // Last one un-done: nothing left to show under "Came true"
  if (filter === DONE && !done.length && !loading) setFilter(ALL);
  const shown = filter === DONE ? done : active.filter((g) => {
    if (filter === ALL) return true;
    if (filter === SECRET) return g.is_secret;
    if (filter === GIVING) return Boolean(g.reservation);
    return g.list === filter;
  });
  const addToCurrent = () => onAdd(lists.includes(filter) ? filter : undefined);

  function switchWhose(next) {
    setWhose(next);
    setFilter(ALL);
  }

  return (
    <>
      <div className="mx-4 mt-3">
        <Segmented rounded>
          <SegmentedButton rounded small active={mineView} onClick={() => switchWhose('mine')}>
            I want
          </SegmentedButton>
          <SegmentedButton rounded small active={!mineView} onClick={() => switchWhose('hers')}>
            {partner?.name ?? 'She'} wants
          </SegmentedButton>
        </Segmented>
      </div>

      {/* Lists row */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <ListTile label={mineView ? 'My wishes' : 'All wishes'} count={active.length} active={filter === ALL} onClick={() => setFilter(ALL)} />
        {done.length > 0 && (
          <ListTile
            label="Came true"
            icon={<CheckmarkSealFill className={`shrink-0 text-[12px] ${filter === DONE ? '' : 'text-together'}`} />}
            count={done.length}
            active={filter === DONE}
            onClick={() => setFilter(DONE)}
          />
        )}
        {lists.map((l) => (
          <ListTile key={l} label={l} count={active.filter((g) => g.list === l).length} active={filter === l} onClick={() => setFilter(l)} />
        ))}
        {mineView && active.some((g) => g.is_secret) && (
          <ListTile
            label="Secret"
            icon={<LockFill className="shrink-0 text-[10px]" />}
            count={active.filter((g) => g.is_secret).length}
            active={filter === SECRET}
            onClick={() => setFilter(SECRET)}
          />
        )}
        {!mineView && active.some((g) => g.reservation) && (
          <ListTile label="I’m giving" icon={<LockFill className="shrink-0 text-[10px]" />} count={active.filter((g) => g.reservation).length} active={filter === GIVING} onClick={() => setFilter(GIVING)} />
        )}
        {mineView &&
          (newList === null ? (
            <button
              type="button"
              onClick={() => setNewList('')}
              className="flex h-[72px] w-28 shrink-0 flex-col justify-between rounded-card border-2 border-dashed border-accent/50 px-3 py-2.5 text-start text-primary"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                <Plus className="text-[13px]" />
              </span>
              <span className="text-subhead leading-tight font-semibold">New list</span>
            </button>
          ) : (
            <input
              autoFocus
              value={newList}
              onChange={(e) => setNewList(e.target.value)}
              onBlur={() => {
                const name = newList.trim();
                if (name) {
                  setExtraLists((l) => [...new Set([...l, name])]);
                  setFilter(name);
                }
                setNewList(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="List name"
              className="h-[72px] w-32 shrink-0 rounded-card bg-surface px-3 text-subhead outline-none"
            />
          ))}
      </div>

      {!mineView && (
        <p className="mx-4 mt-2 flex items-center gap-2 rounded-control bg-accent/10 px-3 py-2 text-subhead text-primary">
          <LockFill className="shrink-0 text-[13px]" />
          What you give is visible only to you.
        </p>
      )}

      {loading ? (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        mineView ? (
          <EmptyState
            title={filter === ALL ? 'Your wishlist is empty' : `Nothing in “${filter === SECRET ? 'Secret' : filter}” yet`}
            text="Paste a link from any shop — the photo, name and price fill in"
            actionLabel="Add a wish"
            onAction={addToCurrent}
          />
        ) : (
          <EmptyState title={`${partner?.name ?? 'She'} hasn’t added wishes here yet`} />
        )
      ) : (
        <div className="mx-4 mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
          {shown.map((g) => (
            <WishCard key={g.id} gift={g} mine={mineView} onOpen={onOpen} onMenu={onMenu} />
          ))}
        </div>
      )}

      {/* Room to scroll the last wishes out from under the floating button */}
      {mineView && <div className="h-16" />}
      {/* Always in reach: floats right above the tabbar */}
      {mineView && (
        <button
          type="button"
          onClick={addToCurrent}
          className="app-bottom-bar fixed inset-x-0 z-30 mx-auto flex h-12 w-fit items-center gap-2 rounded-full bg-accent ps-4 pe-5 text-body font-semibold text-white shadow-lg shadow-accent/30 active:scale-95 bottom-[calc(max(8px,calc(var(--k-safe-area-bottom)-6px))+80px)]"
        >
          <Plus className="text-[20px]" />
          Add a wish
        </button>
      )}
    </>
  );
}
