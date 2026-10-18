'use client';

import { useState } from 'react';
import { BlockFooter, BlockTitle, Link, List, ListInput, Sheet, Toolbar } from 'konsta/react';
import CitySearch from './CitySearch';
import { useSession } from './SessionProvider';
import { errorMessage, supabase } from '@/lib/supabase';
import { ADDRESS_FIELDS } from '@/lib/address';

function initialForm(me, address) {
  return {
    name: me.name ?? '',
    birthday: me.birthday ?? '',
    place: { city: me.city, lat: me.lat, lon: me.lon, timezone: me.timezone },
    address: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f.key, address?.[f.key] ?? ''])),
  };
}

function ProfileForm({ me, address, onClose, onSaved }) {
  const { refresh } = useSession();
  const [form, setForm] = useState(() => initialForm(me, address));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const setAddress = (key, value) => setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));

  async function save() {
    setBusy(true);
    setError(null);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: form.name.trim(), birthday: form.birthday || null, ...form.place })
      .eq('id', me.id);
    const addressRow = Object.fromEntries(
      Object.entries(form.address).map(([k, v]) => [k, v.trim() || null])
    );
    const { error: addressError } = await supabase
      .from('addresses')
      .upsert({ profile_id: me.id, ...addressRow, updated_at: new Date().toISOString() });
    setBusy(false);
    const err = profileError || addressError;
    if (err) {
      setError(errorMessage(err));
      return;
    }
    await refresh();
    await onSaved();
    onClose();
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <div className="left">
          <Link toolbar onClick={onClose}>
            Cancel
          </Link>
        </div>
        <div className="right">
          <Link toolbar onClick={save} className={busy || !form.name.trim() ? 'pointer-events-none opacity-40' : ''}>
            <b>Save</b>
          </Link>
        </div>
      </Toolbar>

      <div className="max-h-[75vh] overflow-auto pb-safe-4">
        <BlockTitle>Profile</BlockTitle>
        <List strong inset>
          <ListInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <CitySearch value={form.place} onChange={(place) => setForm((f) => ({ ...f, place }))} />
          <ListInput
            label="Birthday"
            type="date"
            value={form.birthday}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
          />
        </List>

        <BlockTitle>Delivery address</BlockTitle>
        <List strong inset>
          {ADDRESS_FIELDS.map((f) => (
            <ListInput
              key={f.key}
              label={f.label}
              type={f.type ?? 'text'}
              autoComplete={f.autoComplete}
              value={form.address[f.key]}
              onChange={(e) => setAddress(f.key, e.target.value)}
            />
          ))}
        </List>
        <BlockFooter>Only your friend can see your address.</BlockFooter>
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}
      </div>
    </>
  );
}

/** Edit my profile and address in a bottom sheet. */
export default function ProfileSheet({ opened, address, onClose, onSaved }) {
  const { me } = useSession();
  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="w-full">
      {/* Remount on open so the form starts from the latest saved values */}
      {opened && me && <ProfileForm me={me} address={address} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}
