'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Button, Link, Sheet, Toast, Toolbar } from 'konsta/react';
import { ArrowUpRightSquare, Checkmark, DocOnDoc, Gift } from 'framework7-icons/react';
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
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        {mine ? (
          <Link toolbar onClick={() => onEdit(gift)}>
            Edit
          </Link>
        ) : (
          <span />
        )}
        <Link toolbar onClick={() => onClose(false)}>
          <b>Done</b>
        </Link>
      </Toolbar>
      <div className="max-h-[80vh] overflow-auto pb-safe-8">
        <div className="mx-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card bg-surface-2">
          {gift.image_urlSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gift.image_urlSrc} alt="" className="h-full w-full object-contain" />
          ) : (
            <Gift className="text-[48px] text-text-secondary" />
          )}
        </div>
        <div className="px-4 pt-4">
          <p className="text-title font-bold">{gift.title}</p>
          {price && <p className="mt-0.5 text-body text-text-secondary">{price}</p>}
          {gift.note && <p className="mt-2 text-body">{gift.note}</p>}
          <p className="mt-2 text-caption text-text-secondary">{mine ? 'Your wish' : `${partner?.name ?? 'Her'} wishes`}</p>
        </div>

        {gift.url && (
          <a
            href={gift.url}
            target="_blank"
            rel="noreferrer"
            className="mx-4 mt-4 flex h-12 items-center justify-center gap-2 rounded-card bg-surface text-body text-primary"
          >
            <ArrowUpRightSquare className="text-[20px]" />
            Open in shop
          </a>
        )}

        {!mine &&
          (gift.reservation ? (
            <>
              <GiftProgress gift={gift} onChanged={() => onClose(true, true)} />
              <button type="button" onClick={() => setConfirm('unreserve')} className="mx-4 mt-3 h-11 w-[calc(100%-2rem)] text-subhead text-danger">
                I’m not giving it anymore
              </button>
            </>
          ) : (
            <div className="mx-4 mt-4">
              <Button
                large
                rounded
                onClick={async () => {
                  await reserveGift(gift, me);
                  onClose(true, true);
                }}
              >
                <Gift className="me-2 text-[20px]" />
                I’m giving this
              </Button>
              <p className="mt-2 text-center text-caption text-text-secondary">{partner?.name ?? 'She'} won’t see it.</p>
            </div>
          ))}

        {mine && (
          <button type="button" onClick={() => setConfirm('delete')} className="mx-4 mt-6 h-12 w-[calc(100%-2rem)] rounded-card bg-surface text-body text-danger">
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
