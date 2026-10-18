'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Button, Sheet, Toast } from 'konsta/react';
import { ArrowUpRightSquare, Checkmark, DocOnDoc, Gift, LockFill, Pencil, Xmark } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { GIFT_STATUSES, deleteGift, reserveGift, unreserveGift, updateReservation } from '@/lib/wishlist';
import { formatAddress } from '@/lib/address';
import { supabase } from '@/lib/supabase';

export const formatPrice = (gift) =>
  gift.price != null ? new Intl.NumberFormat('en', { style: 'currency', currency: gift.currency || 'EUR', maximumFractionDigits: 2 }).format(gift.price) : null;

/** I’m giving it → Ordered → Delivered → Given. Only the giver ever sees this. */
function GiftProgress({ gift, onChanged }) {
  const { partner } = useSession();
  const reservation = gift.reservation;
  const current = GIFT_STATUSES.findIndex((s) => s.id === reservation.status);
  const [tracking, setTracking] = useState(reservation.tracking ?? '');
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    const { data } = await supabase.from('addresses').select('*').eq('profile_id', partner.id).maybeSingle();
    const text = formatAddress(data);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-4 mt-4 rounded-card bg-surface-2/60 p-4">
      <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Only you see this</p>
      <ol className="mt-3 space-y-1">
        {GIFT_STATUSES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={async () => {
                await updateReservation(gift, { status: s.id });
                onChanged();
              }}
              className="flex h-11 w-full items-center gap-3 text-start"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${i <= current ? 'bg-accent text-white' : 'border-2 border-text-secondary/30'}`}
              >
                {i <= current && <Checkmark className="text-[14px]" />}
              </span>
              <span className={`text-body ${i === current ? 'font-semibold' : i < current ? 'text-text-secondary' : ''}`}>{s.label}</span>
            </button>
          </li>
        ))}
      </ol>

      {current >= 1 && (
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          onBlur={() => tracking !== (reservation.tracking ?? '') && updateReservation(gift, { tracking: tracking.trim() || null })}
          placeholder="Tracking number"
          className="mt-2 h-11 w-full rounded-control bg-surface px-3 text-body outline-none"
        />
      )}

      <Button rounded tonal className="mt-3" onClick={copyAddress}>
        <DocOnDoc className="me-1.5 text-[18px]" />
        Copy {partner?.name ?? 'her'}’s address
      </Button>
      <Toast position="center" opened={copied}>
        Address copied
      </Toast>
    </div>
  );
}

function Detail({ gift, onClose, onEdit }) {
  const { me, partner } = useSession();
  const mine = gift.wisher_id === me.id;
  const [confirm, setConfirm] = useState(null); // 'delete' | 'unreserve'
  const price = formatPrice(gift);

  return (
    <>
      <div className="max-h-[88vh] overflow-auto pb-safe-8">
        {/* Full-width photo on top, like an Ohmywishes wish */}
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-t-[inherit] bg-surface-2">
          {gift.image_urlSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gift.image_urlSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <Gift className="text-[64px] text-text-secondary" />
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={() => onClose(false)}
            className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
          >
            <Xmark className="text-[16px]" />
          </button>
          {mine && (
            <button
              type="button"
              onClick={() => onEdit(gift)}
              className="absolute start-3 top-3 flex h-10 items-center gap-1.5 rounded-full bg-black/45 px-3.5 text-subhead font-semibold text-white backdrop-blur-md"
            >
              <Pencil className="text-[14px]" />
              Edit
            </button>
          )}
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 text-subhead text-text-secondary">
            <Avatar who={mine ? 'me' : 'her'} name={(mine ? me : partner)?.name} src={(mine ? me : partner)?.avatar} className="h-6! w-6! text-[11px]!" />
            {mine ? 'Your wish' : partner?.name}
            {gift.list && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-caption">{gift.list}</span>}
            {mine && gift.is_secret && (
              <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-caption">
                <LockFill className="text-[10px]" />
                Secret
              </span>
            )}
          </div>
          <p className="mt-2 text-title leading-tight font-bold">{gift.title}</p>
          {gift.note && <p className="mt-2 text-body text-text-secondary">{gift.note}</p>}

          {(price || gift.url) && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-title font-bold">{price}</span>
              {gift.url && (
                <a
                  href={gift.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-subhead font-semibold"
                >
                  <ArrowUpRightSquare className="text-[16px]" />
                  Where to buy
                </a>
              )}
            </div>
          )}
        </div>

        {!mine &&
          (gift.reservation ? (
            <>
              <GiftProgress gift={gift} onChanged={() => onClose(true, true)} />
              <button type="button" onClick={() => setConfirm('unreserve')} className="mx-4 mt-3 h-11 w-[calc(100%-2rem)] text-subhead text-danger">
                I’m not giving it anymore
              </button>
            </>
          ) : (
            <div className="mx-4 mt-6">
              <button
                type="button"
                onClick={async () => {
                  await reserveGift(gift, me);
                  onClose(true, true);
                }}
                className="flex h-14 w-full flex-col items-center justify-center rounded-full bg-text text-bg"
              >
                <span className="text-body font-semibold">I’m giving this</span>
                <span className="text-[11px] opacity-60">{partner?.name ?? 'She'} won’t know</span>
              </button>
            </div>
          ))}

        {mine && (
          <button type="button" onClick={() => setConfirm('delete')} className="mx-4 mt-6 h-12 w-[calc(100%-2rem)] rounded-full bg-surface text-body text-danger">
            Delete wish
          </button>
        )}
      </div>

      <Actions opened={Boolean(confirm)} onBackdropClick={() => setConfirm(null)}>
        <ActionsGroup>
          <ActionsLabel>{confirm === 'delete' ? `Delete “${gift.title}”?` : 'Cancel your plan to give this gift?'}</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              const action = confirm;
              setConfirm(null);
              if (action === 'delete') await deleteGift(gift);
              else await unreserveGift(gift);
              onClose(true);
            }}
          >
            {confirm === 'delete' ? 'Delete' : 'Yes, cancel'}
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirm(null)}>
            Back
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </>
  );
}

/** onClose(changed, keepOpen) */
export default function GiftDetail({ gift, onClose, onEdit }) {
  return (
    <Sheet opened={Boolean(gift)} onBackdropClick={() => onClose(false)} className="w-full">
      {gift && <Detail gift={gift} onClose={onClose} onEdit={onEdit} />}
    </Sheet>
  );
}
