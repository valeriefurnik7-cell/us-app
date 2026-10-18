'use client';

import { useRef, useState } from 'react';
import { Link, Preloader, Sheet, Toggle, Toolbar } from 'konsta/react';
import { CameraFill, DocOnClipboard, Gift, Link as LinkIcon, LockFill, PencilCircle, Plus } from 'framework7-icons/react';
import { useSession } from '../SessionProvider';
import { saveGift } from '@/lib/wishlist';
import { apiGet } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'PLN', 'CZK', 'HUF', 'CHF', 'RUB'];

const looksLikeLink = (text) => /^https?:\/\/\S+$/i.test(text.trim());

/** Optional, like Ohmywishes: paste a link and let the card fill itself — or go back to filling it by hand. */
function LinkStep({ onFilled, onCancel }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fill(link) {
    if (!looksLikeLink(link)) return;
    setLoading(true);
    setError(null);
    const info = await apiGet(`/api/link-preview?url=${encodeURIComponent(link.trim())}`);
    setLoading(false);
    // Even when the shop blocks us, keep the link and let her finish the card by hand.
    onFilled({ url: link.trim(), title: info?.title ?? '', price: info?.price ?? '', currency: info?.currency, image: info?.image ?? null });
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      if (looksLikeLink(text)) await fill(text);
      else setError('There’s no link in the clipboard.');
    } catch {
      setError('Couldn’t read the clipboard — paste the link into the field.');
    }
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <span className="ps-2 text-body font-semibold">New wish</span>
        <Link toolbar onClick={onCancel}>
          Back
        </Link>
      </Toolbar>
      <div className="px-4 pt-2 pb-safe-8">
        <p className="text-title font-bold">Paste a link to the thing</p>
        <p className="mt-1 text-subhead text-text-secondary">Photo, name and price fill in by themselves.</p>

        <label className="mt-4 flex h-14 items-center gap-2 rounded-card bg-surface-2 px-4">
          <LinkIcon className="shrink-0 text-[18px] text-text-secondary" />
          <input
            type="url"
            inputMode="url"
            value={url}
            placeholder="https://"
            onChange={(e) => setUrl(e.target.value)}
            onPaste={(e) => fill(e.clipboardData.getData('text'))}
            onKeyDown={(e) => e.key === 'Enter' && fill(url)}
            className="h-full min-w-0 flex-1 bg-transparent text-body outline-none"
          />
          {loading && <Preloader className="h-5! w-5!" />}
        </label>

        <button
          type="button"
          onClick={looksLikeLink(url) ? () => fill(url) : paste}
          disabled={loading}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-body font-semibold text-white disabled:opacity-50"
        >
          <DocOnClipboard className="text-[18px]" />
          {looksLikeLink(url) ? 'Use this link' : 'Paste from clipboard'}
        </button>
        {error && <p className="mt-2 text-center text-subhead text-danger">{error}</p>}

        <div className="my-6 flex items-center gap-3 text-caption text-text-secondary">
          <span className="h-px flex-1 bg-text-secondary/20" />
          or
          <span className="h-px flex-1 bg-text-secondary/20" />
        </div>

        <button type="button" onClick={onCancel} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-2 text-body font-semibold">
          <PencilCircle className="text-[20px] text-primary" />
          Fill in by hand
        </button>
      </div>
    </>
  );
}

/** The wish card itself — what opens first. */
function WishForm({ gift, draft, lists, onClose, onBack }) {
  const { me, pair, partner } = useSession();
  const photoInput = useRef(null);
  const [form, setForm] = useState({
    url: gift?.url ?? draft?.url ?? '',
    title: gift?.title ?? draft?.title ?? '',
    price: gift?.price ?? draft?.price ?? '',
    currency: gift?.currency ?? (CURRENCIES.includes(draft?.currency) ? draft.currency : me.currency ?? 'EUR'),
    note: gift?.note ?? '',
    list: gift?.list ?? draft?.list ?? '',
    is_secret: gift?.is_secret ?? false,
  });
  const [image, setImage] = useState(draft?.image ?? undefined); // File | URL | undefined (keep)
  const [preview, setPreview] = useState(gift?.image_urlSrc ?? draft?.image ?? null);
  const [newList, setNewList] = useState(null); // string while typing a new list name
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const allLists = [...new Set([...lists, form.list].filter(Boolean))];

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await saveGift({ ...gift, ...form }, { me, pair, image });
    if (error) {
      // Most likely the database is missing a newer migration — say so plainly.
      setError(/column|schema cache/i.test(error.message) ? 'Couldn’t save: the database needs the latest SQL update (Supabase → SQL Editor).' : errorMessage(error));
      setBusy(false);
      return;
    }
    onClose(true, { list: form.list, isSecret: form.is_secret });
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{gift ? 'Edit wish' : 'New wish'}</span>
        <Link toolbar onClick={save} className={busy || !form.title.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{busy ? 'Saving…' : gift ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>

      <div className="max-h-[80vh] overflow-auto pb-safe-8">
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
        {/* Hand-filled by default; a link can still fill photo, name and price in one go */}
        {!gift && !form.title && !preview && (
          <button type="button" onClick={onBack} className="mx-4 mb-3 flex h-11 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-surface-2 text-subhead font-semibold text-primary">
            <LinkIcon className="text-[16px]" />
            Autofill from a link
          </button>
        )}
        {/* Big photo on top, like the wish card */}
        <button
          type="button"
          onClick={() => photoInput.current?.click()}
          className="relative mx-4 mt-1 flex aspect-[4/3] w-[calc(100%-2rem)] items-center justify-center overflow-hidden rounded-card bg-surface-2"
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
              <span className="absolute end-3 bottom-3 flex h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-subhead text-white backdrop-blur-md">
                <CameraFill className="text-[15px]" />
                Change
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-2 text-subhead text-text-secondary">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white">
                <CameraFill className="text-[24px]" />
              </span>
              Add a photo
            </span>
          )}
        </button>

        <div className="px-4 pt-4">
          <textarea
            value={form.title}
            onChange={set('title')}
            placeholder="What do you wish for?"
            rows={2}
            className="w-full resize-none bg-transparent text-title leading-tight font-bold outline-none placeholder:text-text-secondary/50"
          />
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={set('price')}
              placeholder="Price"
              className="h-11 w-32 rounded-control bg-surface-2 px-3 text-body font-semibold outline-none placeholder:font-normal placeholder:text-text-secondary/60"
            />
            <select value={form.currency} onChange={set('currency')} className="h-11 rounded-control bg-surface-2 px-3 text-body outline-none">
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <section className="mx-4 mt-5 overflow-hidden rounded-card bg-surface">
          <label className="flex min-h-12 items-center gap-3 border-b border-text-secondary/15 px-4">
            <LinkIcon className="shrink-0 text-[18px] text-text-secondary" />
            <input
              type="url"
              inputMode="url"
              value={form.url}
              onChange={set('url')}
              placeholder="Where to buy (link)"
              className="h-12 min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-text-secondary/60"
            />
          </label>
          <textarea
            value={form.note}
            onChange={set('note')}
            placeholder="Comment: size, color, anything that helps"
            rows={2}
            className="block w-full resize-none bg-transparent px-4 py-3 text-body outline-none placeholder:text-text-secondary/60"
          />
        </section>

        <h3 className="mx-8 mt-5 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">List</h3>
        <div className="flex flex-wrap gap-2 px-4">
          <button
            type="button"
            onClick={() => setForm({ ...form, list: '' })}
            className={`h-9 rounded-full px-3.5 text-subhead ${!form.list ? 'bg-accent text-white' : 'bg-surface'}`}
          >
            Just wishes
          </button>
          {allLists.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setForm({ ...form, list: l })}
              className={`h-9 rounded-full px-3.5 text-subhead ${form.list === l ? 'bg-accent text-white' : 'bg-surface'}`}
            >
              {l}
            </button>
          ))}
          {newList === null ? (
            <button
              type="button"
              onClick={() => setNewList('')}
              className="flex h-9 items-center gap-1 rounded-full border border-dashed border-text-secondary/40 px-3.5 text-subhead text-primary"
            >
              <Plus className="text-[14px]" />
              New list
            </button>
          ) : (
            <input
              autoFocus
              value={newList}
              onChange={(e) => setNewList(e.target.value)}
              onBlur={() => {
                if (newList.trim()) setForm((f) => ({ ...f, list: newList.trim() }));
                setNewList(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="Birthday, Home…"
              className="h-9 w-40 rounded-full bg-surface px-3.5 text-subhead outline-none"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setForm({ ...form, is_secret: !form.is_secret })}
          className="mx-4 mt-5 flex min-h-14 w-[calc(100%-2rem)] items-center gap-3 rounded-card bg-surface px-4 text-start"
        >
          <LockFill className={`shrink-0 text-[18px] ${form.is_secret ? 'text-primary' : 'text-text-secondary'}`} />
          <span className="flex-1">
            <span className="block text-body">Secret wish</span>
            <span className="block text-caption text-text-secondary">Only you will see it — {partner?.name ?? 'she'} won’t.</span>
          </span>
          <span className="pointer-events-none">
            <Toggle component="span" checked={form.is_secret} readOnly />
          </span>
        </button>

        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}
      </div>
    </>
  );
}

/** Add a wish (by hand, or autofilled from a link) or edit one. onClose(changed). */
export default function GiftSheet({ opened, gift, lists = [], defaultList, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'link'
  const [draft, setDraft] = useState(null);
  const close = (changed, saved) => {
    setStep('form');
    setDraft(null);
    onClose(changed, saved);
  };

  return (
    <Sheet opened={opened} onBackdropClick={() => close(false)} className="w-full">
      {opened &&
        (gift || step === 'form' ? (
          <WishForm
            gift={gift}
            draft={{ list: defaultList, ...draft }}
            lists={lists}
            onClose={close}
            onBack={() => setStep('link')}
          />
        ) : (
          <LinkStep
            onCancel={() => setStep('form')}
            onFilled={(info) => {
              setDraft(info);
              setStep('form');
            }}
          />
        ))}
    </Sheet>
  );
}

export function GiftPlaceholder() {
  return <Gift className="text-[32px] text-text-secondary" />;
}
