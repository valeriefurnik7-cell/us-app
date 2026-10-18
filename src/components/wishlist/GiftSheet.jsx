'use client';

import { useRef, useState } from 'react';
import { Link, Preloader, Sheet, Toolbar } from 'konsta/react';
import { Camera, Gift } from 'framework7-icons/react';
import { Field, FieldGroup, TextInput } from '../FormRows';
import { useSession } from '../SessionProvider';
import { saveGift } from '@/lib/wishlist';
import { apiGet } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'PLN', 'CZK', 'HUF', 'CHF', 'RUB'];

function GiftForm({ gift, onClose }) {
  const { me, pair } = useSession();
  const photoInput = useRef(null);
  const [form, setForm] = useState({
    url: gift?.url ?? '',
    title: gift?.title ?? '',
    price: gift?.price ?? '',
    currency: gift?.currency ?? 'EUR',
    note: gift?.note ?? '',
  });
  const [image, setImage] = useState(undefined); // File | URL string | undefined (keep)
  const [preview, setPreview] = useState(gift?.image_urlSrc ?? null);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Pull the photo, name and price from the shop page.
  async function fillFromLink(url) {
    if (!/^https?:\/\//i.test(url.trim())) return;
    setFetching(true);
    const info = await apiGet(`/api/link-preview?url=${encodeURIComponent(url.trim())}`);
    setFetching(false);
    if (!info) return;
    setForm((f) => ({
      ...f,
      title: f.title || info.title || '',
      price: f.price || info.price || '',
      currency: info.currency && CURRENCIES.includes(info.currency) ? info.currency : f.currency,
    }));
    if (info.image && !preview) {
      setImage(info.image);
      setPreview(info.image);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await saveGift({ ...gift, ...form }, { me, pair, image });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    onClose(true);
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{gift ? 'Edit wish' : 'New wish'}</span>
        <Link toolbar onClick={save} className={busy || !form.title.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{gift ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>

      <div className="max-h-[78vh] overflow-auto pb-safe-8">
        <FieldGroup footer="Paste a link — the photo, name and price fill in by themselves when the shop allows it.">
          <Field label="Link">
            <TextInput
              type="url"
              inputMode="url"
              placeholder="https://"
              value={form.url}
              onChange={set('url')}
              onBlur={(e) => fillFromLink(e.target.value)}
              onPaste={(e) => fillFromLink(e.clipboardData.getData('text'))}
            />
            {fetching && <Preloader className="h-5! w-5!" />}
          </Field>
        </FieldGroup>

        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            setImage(file);
            setPreview(URL.createObjectURL(file));
          }}
        />
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          className="mx-auto mt-6 flex h-36 w-36 items-center justify-center overflow-hidden rounded-card bg-surface text-text-secondary"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-caption">
              <Camera className="text-[28px] text-primary" />
              Add photo
            </span>
          )}
        </button>

        <FieldGroup>
          <Field label="Name">
            <TextInput value={form.title} placeholder="Required" onChange={set('title')} />
          </Field>
          <Field label="Price">
            <TextInput type="number" inputMode="decimal" value={form.price} placeholder="Optional" onChange={set('price')} />
            <select value={form.currency} onChange={set('currency')} className="bg-transparent text-body text-text-secondary outline-none">
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Note">
            <TextInput value={form.note} placeholder="Size M, black…" onChange={set('note')} />
          </Field>
        </FieldGroup>

        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}
      </div>
    </>
  );
}

export default function GiftSheet({ opened, gift, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={() => onClose(false)} className="w-full">
      {opened && <GiftForm gift={gift} onClose={onClose} />}
    </Sheet>
  );
}

export function GiftPlaceholder() {
  return <Gift className="text-[32px] text-text-secondary" />;
}
