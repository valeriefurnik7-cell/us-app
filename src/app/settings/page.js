'use client';

import { useEffect, useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Radio, Toggle } from 'konsta/react';
import Screen from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { Field, FieldGroup, TextInput } from '@/components/FormRows';
import { useTheme } from '@/components/ThemeProvider';
import { useSession } from '@/components/SessionProvider';
import { CURRENCIES } from '@/components/wishlist/GiftSheet';
import { supabase } from '@/lib/supabase';
import { NOTIFICATION_TYPES, currentSubscription, disablePush, enablePush, pushSupport } from '@/lib/push';

const MODES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'Like my phone' },
];

function PairName() {
  const { pair, refresh } = useSession();
  const [name, setName] = useState(pair?.name ?? '');

  async function save() {
    const next = name.trim();
    if (!next || next === pair.name) return setName(pair.name);
    await supabase.from('pairs').update({ name: next }).eq('id', pair.id);
    await refresh();
  }

  return (
    <FieldGroup title="Friendship name">
      <Field label="Name">
        <TextInput value={name} placeholder="Us" onChange={(e) => setName(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
      </Field>
    </FieldGroup>
  );
}

function Notifications() {
  const { me, partner, refresh } = useSession();
  const support = pushSupport();
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState(false);
  const prefs = me.notify_prefs ?? {};

  useEffect(() => {
    if (support !== 'supported') return;
    currentSubscription().then((s) => setEnabled(Boolean(s) && Notification.permission === 'granted'));
  }, [support]);

  const savePrefs = async (patch) => {
    await supabase.from('profiles').update({ notify_prefs: { ...prefs, ...patch } }).eq('id', me.id);
    await refresh();
  };

  async function toggleDevice() {
    setBusy(true);
    if (enabled) {
      await disablePush();
      setEnabled(false);
    } else {
      setEnabled(await enablePush(me));
    }
    setBusy(false);
  }

  const footer =
    support === 'needs-install'
      ? 'On iPhone, notifications work only after you add the app to the Home Screen (Share → Add to Home Screen) and open it from there.'
      : support === 'unsupported'
        ? 'Notifications aren’t available here.'
        : enabled === false && typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'Notifications are blocked. Turn them on in iPhone Settings → Notifications → Us.'
          : 'This turns notifications on for this phone.';

  return (
    <>
      <FieldGroup title="Notifications" footer={footer}>
        <Field label="This phone">
          <span className="flex flex-1 justify-end">
            <Toggle checked={Boolean(enabled)} disabled={support !== 'supported' || busy || enabled === null} onChange={toggleDevice} />
          </span>
        </Field>
      </FieldGroup>

      {enabled && (
        <FieldGroup title="Notify me about">
          {NOTIFICATION_TYPES.map((t) => (
            <li key={t.id} className="group flex min-h-12 items-center ps-4">
              <div className="flex min-h-12 flex-1 items-center gap-3 border-b border-text-secondary/20 py-1.5 pe-4 group-last:border-0">
                <span className="flex-1">
                  <span className="block text-body">{t.id === 'birthday' && partner ? `${partner.name}’s birthday in a week` : t.label}</span>
                  {t.hint && <span className="block text-caption text-text-secondary">{t.hint}</span>}
                </span>
                {t.id === 'pet_of_day' && prefs.pet_of_day !== false && (
                  <select
                    value={prefs.pet_hour ?? 19}
                    onChange={(e) => savePrefs({ pet_hour: Number(e.target.value) })}
                    className="w-20 shrink-0 bg-transparent text-end text-body text-text-secondary outline-none"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                )}
                <Toggle checked={prefs[t.id] !== false} onChange={() => savePrefs({ [t.id]: prefs[t.id] === false })} />
              </div>
            </li>
          ))}
        </FieldGroup>
      )}
    </>
  );
}

function Currency() {
  const { me, refresh } = useSession();
  return (
    <FieldGroup title="Money" footer="Used for new gifts and trip budgets.">
      <Field label="Currency">
        <select
          value={me.currency ?? 'EUR'}
          onChange={async (e) => {
            await supabase.from('profiles').update({ currency: e.target.value }).eq('id', me.id);
            await refresh();
          }}
          className="min-w-0 flex-1 bg-transparent text-end text-body text-text-secondary outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
    </FieldGroup>
  );
}

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { session, signOut } = useSession();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <Screen>
      <InnerNavbar title="Settings" />

      <PairName />

      <FieldGroup title="Appearance">
        {MODES.map((m) => (
          <li key={m.id}>
            <label className="group flex min-h-12 items-center ps-4">
              <span className="flex min-h-12 flex-1 items-center border-b border-text-secondary/20 pe-4 group-last:border-0">
                <span className="flex-1 text-body">{m.label}</span>
                <Radio component="span" checked={mode === m.id} onChange={() => setMode(m.id)} />
              </span>
            </label>
          </li>
        ))}
      </FieldGroup>

      <Notifications />
      <Currency />

      <FieldGroup title="Account" footer={session?.user.email}>
        <li>
          <button type="button" onClick={() => setConfirmSignOut(true)} className="h-12 w-full px-4 text-start text-body text-danger">
            Sign out
          </button>
        </li>
      </FieldGroup>

      <Actions opened={confirmSignOut} onBackdropClick={() => setConfirmSignOut(false)}>
        <ActionsGroup>
          <ActionsLabel>You’ll need your email and password to sign back in.</ActionsLabel>
          <ActionsButton className="text-danger!" onClick={signOut}>
            Sign out
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirmSignOut(false)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </Screen>
  );
}
