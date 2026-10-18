'use client';

import { useState } from 'react';
import { Segmented, SegmentedButton } from 'konsta/react';
import { ChevronDown, Gift, LockFill, Plus } from 'framework7-icons/react';
import { EmptyState } from '../Screen';
import { useSession } from '../SessionProvider';
import { formatPrice } from './GiftDetail';
import { GIFT_STATUSES } from '@/lib/wishlist';

function GiftCard({ gift, onOpen }) {
  const price = formatPrice(gift);
  const status = gift.reservation && GIFT_STATUSES.find((s) => s.id === gift.reservation.status);
  return (
    <button type="button" onClick={() => onOpen(gift)} className="overflow-hidden rounded-card bg-surface text-start">
      <div className="relative flex aspect-square items-center justify-center bg-surface-2">
        {gift.image_urlSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={gift.image_urlSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Gift className="text-[36px] text-text-secondary" />
        )}
        {status && (
          <span className="absolute start-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-caption font-semibold text-white">
            <LockFill className="text-[10px]" />
            {status.id === 'reserved' ? 'Mine' : status.label}
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-subhead font-semibold">{gift.title}</p>
        {price && <p className="text-caption text-text-secondary">{price}</p>}
      </div>
    </button>
  );
}

export default function GiftsTab({ gifts, loading, onOpen, onAdd }) {
  const { me, partner } = useSession();
  const [whose, setWhose] = useState('mine');
  const [showGiven, setShowGiven] = useState(false);

  const list = gifts.filter((g) => (whose === 'mine' ? g.wisher_id === me.id : g.wisher_id !== me.id));
  // Gifts I already gave move to a folded section, newest first.
  const given = list.filter((g) => g.reservation?.status === 'given').sort((a, b) => new Date(b.reservation.given_at) - new Date(a.reservation.given_at));
  const open = list.filter((g) => g.reservation?.status !== 'given');

  return (
    <>
      <div className="mx-4 mt-3 w-auto">
        <Segmented rounded>
          <SegmentedButton rounded small active={whose === 'mine'} onClick={() => setWhose('mine')}>
            I want
          </SegmentedButton>
          <SegmentedButton rounded small active={whose === 'hers'} onClick={() => setWhose('hers')}>
            {partner?.name ?? 'She'} wants
          </SegmentedButton>
        </Segmented>
      </div>

      <p className="mx-4 mt-3 flex items-center gap-2 rounded-control bg-accent/10 px-3 py-2 text-subhead text-primary">
        <LockFill className="shrink-0 text-[14px]" />
        Gift plans are visible only to the giver.
      </p>

      {loading ? (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface" />
          ))}
        </div>
      ) : open.length === 0 && given.length === 0 ? (
        whose === 'mine' ? (
          <EmptyState title="Your wishlist is empty" text="Add things you’d love to get" actionLabel="Add a wish" onAction={onAdd} />
        ) : (
          <EmptyState title={`${partner?.name ?? 'She'} hasn’t added wishes yet`} />
        )
      ) : (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {open.map((g) => (
            <GiftCard key={g.id} gift={g} onOpen={onOpen} />
          ))}
          {whose === 'mine' && (
            <button
              type="button"
              onClick={onAdd}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-text-secondary/25 text-subhead font-semibold text-primary"
            >
              <Plus className="text-[24px]" />
              Add wish
            </button>
          )}
        </div>
      )}

      {given.length > 0 && (
        <section className="mx-4 mt-6">
          <button type="button" onClick={() => setShowGiven(!showGiven)} className="flex h-11 w-full items-center justify-between px-1">
            <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Already given · {given.length}</span>
            <ChevronDown className={`text-[16px] text-text-secondary transition-transform ${showGiven ? 'rotate-180' : ''}`} />
          </button>
          {showGiven && (
            <ul className="overflow-hidden rounded-card bg-surface">
              {given.map((g) => (
                <li key={g.id}>
                  <button type="button" onClick={() => onOpen(g)} className="flex min-h-12 w-full items-center justify-between border-b border-text-secondary/15 px-4 text-start last:border-0">
                    <span className="truncate text-body">{g.title}</span>
                    <span className="shrink-0 text-subhead text-text-secondary">
                      {new Date(g.reservation.given_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
