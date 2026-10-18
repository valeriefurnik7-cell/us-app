'use client';

import { useRef, useState } from 'react';
import { BlockFooter, BlockTitle, Link, List, ListInput, Sheet, Toolbar } from 'konsta/react';
import { Camera } from 'framework7-icons/react';
import { useSession } from '../SessionProvider';
import { supabase, errorMessage } from '@/lib/supabase';
import { removeMedia, uploadMedia } from '@/lib/media';

const FAVORITES = [
  { key: 'food', label: 'Favorite food', short: 'Food' },
  { key: 'toys', label: 'Favorite toys', short: 'Toys' },
  { key: 'sleep', label: 'Favorite sleeping spot', short: 'Sleeps on' },
];

function CatForm({ cat, onClose, onSaved }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const [form, setForm] = useState({
    name: cat?.name ?? '',
    breed: cat?.breed ?? '',
    birthday: cat?.birthday ?? '',
    character: cat?.character ?? '',
    favorites: { food: '', toys: '', sleep: '', ...cat?.favorites },
  });
  const [cover, setCover] = useState(null); // new File
  const [preview, setPreview] = useState(cat?.cover ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function pickCover(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCover(file);
    setPreview(URL.createObjectURL(file));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const coverUrl = cover ? await uploadMedia(cover, pair.id, 'cats') : cat?.cover_url ?? null;
      const row = {
        name: form.name.trim(),
        breed: form.breed.trim() || null,
        birthday: form.birthday || null,
        character: form.character.trim() || null,
        favorites: Object.fromEntries(Object.entries(form.favorites).map(([k, v]) => [k, v.trim()])),
        cover_url: coverUrl,
      };
      const { data, error } = cat
        ? await supabase.from('cats').update(row).eq('id', cat.id).select().single()
        : await supabase.from('cats').insert({ ...row, pair_id: pair.id, owner_id: me.id }).select().single();
      if (error) throw error;
      if (cover && cat?.cover_url) await removeMedia([cat.cover_url]);
      if (!cat) await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'cat_added', target_id: data.id });
      await onSaved?.();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={onClose}>
          Cancel
        </Link>
        <Link toolbar onClick={save} className={busy || !form.name.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{cat ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>

      <div className="max-h-[75vh] overflow-auto pb-safe-4">
        <input ref={input} type="file" accept="image/*" hidden onChange={pickCover} />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mx-auto mt-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-primary"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <Camera className="text-[32px]" />
          )}
        </button>
        <p className="mt-2 text-center text-subhead text-primary">{preview ? 'Change photo' : 'Add photo'}</p>

        <BlockTitle>About</BlockTitle>
        <List strong inset>
          <ListInput label="Name" placeholder="Max" value={form.name} onChange={set('name')} />
          <ListInput label="Breed" placeholder="Optional" value={form.breed} onChange={set('breed')} />
          <ListInput label="Birthday" type="date" value={form.birthday} onChange={set('birthday')} />
          <ListInput label="Character in two words" placeholder="Lazy, cuddly" value={form.character} onChange={set('character')} />
        </List>

        <BlockTitle>Favorites</BlockTitle>
        <List strong inset>
          {FAVORITES.map((f) => (
            <ListInput
              key={f.key}
              label={f.label}
              placeholder="Optional"
              value={form.favorites[f.key]}
              onChange={(e) => setForm({ ...form, favorites: { ...form.favorites, [f.key]: e.target.value } })}
            />
          ))}
        </List>
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}
      </div>
    </>
  );
}

/** Add a new cat (cat = null) or edit an existing one. */
export default function CatSheet({ opened, cat, onClose, onSaved }) {
  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="w-full">
      {opened && <CatForm cat={cat} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

export { FAVORITES };
