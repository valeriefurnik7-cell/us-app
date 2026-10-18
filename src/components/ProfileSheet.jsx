'use client';

import { useRef, useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, Link, Navbar, Page, Popup } from 'konsta/react';
import Avatar from './Avatar';
import CitySearch from './CitySearch';
import { Field, FieldGroup, TextInput } from './FormRows';
import { useSession } from './SessionProvider';
import { errorMessage, supabase } from '@/lib/supabase';
import { removeMedia, uploadMedia } from '@/lib/media';
import { ADDRESS_FIELDS } from '@/lib/address';

const field = (key) => ADDRESS_FIELDS.find((f) => f.key === key);
const RECIPIENT = ['recipient', 'phone'].map(field);
const ADDRESS = ['street', 'apartment', 'city', 'zip', 'country'].map(field);

function initialForm(me, address) {
  return {
    name: me.name ?? '',
    birthday: me.birthday ?? '',
    place: { city: me.city, lat: me.lat, lon: me.lon, timezone: me.timezone },
    address: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f.key, address?.[f.key] ?? ''])),
  };
}

function ProfileForm({ me, partner, address, onClose, onSaved }) {
  const { pair, refresh } = useSession();
  const photoInput = useRef(null);
  const [form, setForm] = useState(() => initialForm(me, address));
  const [photo, setPhoto] = useState(undefined); // undefined = unchanged, null = removed, File = new
  const [preview, setPreview] = useState(me.avatar);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const setAddress = (key, value) => setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));

  function pickPhoto(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      let avatarUrl = me.avatar_url;
      if (photo !== undefined) {
        avatarUrl = photo ? await uploadMedia(photo, pair.id, 'avatars') : null;
        if (me.avatar_url) await removeMedia([me.avatar_url]);
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: form.name.trim(), birthday: form.birthday || null, avatar_url: avatarUrl, ...form.place })
        .eq('id', me.id);
      if (profileError) throw profileError;
      const addressRow = Object.fromEntries(Object.entries(form.address).map(([k, v]) => [k, v.trim() || null]));
      const { error: addressError } = await supabase
        .from('addresses')
        .upsert({ profile_id: me.id, ...addressRow, updated_at: new Date().toISOString() });
      if (addressError) throw addressError;
      await refresh();
      await onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Page className="pb-safe-8">
      <Navbar
        title="Edit profile"
        left={<Link onClick={onClose}>Cancel</Link>}
        right={
          <Link onClick={save} className={busy || !form.name.trim() ? 'pointer-events-none opacity-40' : ''}>
            <b>{busy ? 'Saving…' : 'Done'}</b>
          </Link>
        }
      />

      <input ref={photoInput} type="file" accept="image/*" hidden onChange={pickPhoto} />
      <div className="flex flex-col items-center pt-4">
        <button type="button" onClick={() => setPhotoMenu(true)} aria-label="Edit photo">
          <Avatar who="me" name={form.name || me.name} src={preview} size="lg" />
        </button>
        <button type="button" onClick={() => setPhotoMenu(true)} className="mt-2 h-11 px-4 text-subhead text-primary">
          {preview ? 'Edit photo' : 'Add photo'}
        </button>
      </div>

      <FieldGroup title="About you">
        <Field label="Name">
          <TextInput
            value={form.name}
            placeholder="Required"
            autoComplete="given-name"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Birthday">
          <TextInput type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
        </Field>
      </FieldGroup>

      <FieldGroup
        title="Where you are"
        footer={form.place.timezone ? `Time zone: ${form.place.timezone}` : 'Used for your local time and weather on Home.'}
      >
        <CitySearch value={form.place} onChange={(place) => setForm((f) => ({ ...f, place }))} />
      </FieldGroup>

      <FieldGroup title="Delivery address · recipient">
        {RECIPIENT.map((f) => (
          <Field key={f.key} label={f.label}>
            <TextInput
              type={f.type ?? 'text'}
              autoComplete={f.autoComplete}
              value={form.address[f.key]}
              onChange={(e) => setAddress(f.key, e.target.value)}
            />
          </Field>
        ))}
      </FieldGroup>

      <FieldGroup
        title="Delivery address · where"
        footer={`Only ${partner?.name ?? 'your friend'} can see your address — to send you gifts.`}
      >
        {ADDRESS.map((f) => (
          <Field key={f.key} label={f.label}>
            <TextInput autoComplete={f.autoComplete} value={form.address[f.key]} onChange={(e) => setAddress(f.key, e.target.value)} />
          </Field>
        ))}
      </FieldGroup>

      {error && <p className="mx-8 mt-4 text-subhead text-danger">{error}</p>}

      <Actions opened={photoMenu} onBackdropClick={() => setPhotoMenu(false)}>
        <ActionsGroup>
          <ActionsButton
            onClick={() => {
              setPhotoMenu(false);
              photoInput.current?.click();
            }}
          >
            Choose photo
          </ActionsButton>
          {preview && (
            <ActionsButton
              className="text-danger!"
              onClick={() => {
                setPhoto(null);
                setPreview(null);
                setPhotoMenu(false);
              }}
            >
              Remove photo
            </ActionsButton>
          )}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setPhotoMenu(false)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </Page>
  );
}

/** Full-screen editor for my profile, photo and address. */
export default function ProfileSheet({ opened, address, onClose, onSaved }) {
  const { me, partner } = useSession();
  return (
    <Popup opened={opened} onBackdropClick={onClose}>
      {opened && me && <ProfileForm me={me} partner={partner} address={address} onClose={onClose} onSaved={onSaved} />}
    </Popup>
  );
}
