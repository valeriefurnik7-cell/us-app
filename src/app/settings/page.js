'use client';

import { useEffect, useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Radio, Toggle } from 'konsta/react';
import Screen from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { Field, FieldGroup, TextInput } from '@/components/FormRows';
import { useTheme } from '@/components/ThemeProvider';
import { useSession } from '@/components/SessionProvider';
import { CURRENCIES } from '@/components/wishlist/GiftSheet';
import { syncLocation } from '@/lib/location';
import { AccentSwatches } from '@/components/AppearanceSheet';
import { applyAccent, parseTheme, saveTheme } from '@/lib/appearance';
import { isDemo, supabase } from '@/lib/supabase';
import { disableDemo, enableDemo } from '@/lib/demo/mode';
import { NOTIFICATION_TYPES, currentSubscription, disablePush, enablePush, pushSupport, sendTestPush } from '@/lib/push';

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
  const [problem, setProblem] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const prefs = me.notify_prefs ?? {};

  useEffect(() => {
    if (support !== 'supported') return;
    currentSubscription()
      .then((s) => setEnabled(Boolean(s) && Notification.permission === 'granted'))
      .catch(() => setEnabled(false));
  }, [support]);

  const savePrefs = async (patch) => {
    await supabase.from('profiles').update({ notify_prefs: { ...prefs, ...patch } }).eq('id', me.id);
    await refresh();
  };

  async function toggleDevice() {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    if (enabled) {
      await disablePush().catch(() => {});
      setEnabled(false);
    } else {
      const error = await enablePush(me);
      setEnabled(!error);
      setProblem(error);
    }
    setBusy(false);
  }

  const footer = problem
    ? problem
    : support === 'needs-install'
      ? 'On iPhone, notifications work only after you add the app to the Home Screen (Share → Add to Home Screen) and open it from there.'
      : support === 'unsupported'
        ? 'Notifications aren’t available here. On iPhone you need iOS 16.4 or newer.'
        : enabled === false && typeof Notification !== 'undefined' && Notification.permission === 'denied'
          ? 'Notifications are blocked. Turn them on in iPhone Settings → Notifications → Us.'
          : 'This turns notifications on for this phone.';

  return (
    <>
      <FieldGroup title="Notifications" footer={footer}>
        {/* The whole row is tappable, not only the small switch. */}
        <li>
          <button
            type="button"
            disabled={support !== 'supported'}
            onClick={toggleDevice}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-start disabled:opacity-50"
          >
            <span className="flex-1 text-body">This phone</span>
            {busy && <span className="text-subhead text-text-secondary">…</span>}
            <span className="pointer-events-none">
              <Toggle component="span" checked={Boolean(enabled)} readOnly />
            </span>
          </button>
        </li>
      </FieldGroup>

      {support === 'supported' && (
        <FieldGroup footer={testResult}>
          <li>
            <button
              type="button"
              onClick={async () => {
                setTestResult('Sending…');
                setTestResult(await sendTestPush());
              }}
              className="h-12 w-full px-4 text-start text-body text-primary"
            >
              Send a test notification
            </button>
          </li>
        </FieldGroup>
      )}

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

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT; // the bot's @username, without the @

const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Friends outside the app who get our pets through the bot: one invite link per friend. */
function TelegramFriends() {
  const { me, pair } = useSession();
  const [friends, setFriends] = useState([]);
  const [note, setNote] = useState(null);

  useEffect(() => {
    const load = () =>
      supabase
        .from('telegram_followers')
        .select('id, name, created_at')
        .order('created_at')
        .then(({ data }) => setFriends(data ?? []));
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function invite() {
    const code = randomCode();
    const link = `https://t.me/${BOT}?start=f_${code}`;
    const saved = supabase.from('telegram_invites').insert({ code, pair_id: pair.id, created_by: me.id });
    // Share sheet right in the tap (iOS needs that); the invite is saved meanwhile.
    if (navigator.share) {
      await navigator.share({ text: `Get our pets in Telegram 🐾 ${link}` }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(link).catch(() => {});
    }
    const { error } = await saved;
    setNote(error ? 'Couldn’t create the invite — try again.' : navigator.share ? 'One link = one friend. Make a new one for each person.' : 'Link copied. One link = one friend.');
  }

  async function remove(id) {
    await supabase.from('telegram_followers').delete().eq('id', id);
    setFriends((list) => list.filter((f) => f.id !== id));
  }

  return (
    <FieldGroup title="Friends who get the pets" footer={note ?? 'They get every pet photo from the chat in Telegram — no app needed.'}>
      {friends.map((f) => (
        <li key={f.id} className="group flex min-h-12 items-center ps-4">
          <div className="flex min-h-12 flex-1 items-center gap-3 border-b border-text-secondary/20 pe-2 group-last:border-0">
            <span className="flex-1 truncate text-body">{f.name || 'Friend'}</span>
            <button type="button" onClick={() => remove(f.id)} className="h-11 px-2 text-subhead text-danger">
              Remove
            </button>
          </div>
        </li>
      ))}
      <li>
        <button type="button" onClick={invite} className="h-12 w-full px-4 text-start text-body text-primary">
          Invite a friend
        </button>
      </li>
    </FieldGroup>
  );
}

/** Pets from the chat also arrive in Telegram: connect = open the bot with a one-time code. */
function Telegram() {
  const { me, partner } = useSession();
  const [linked, setLinked] = useState(null); // null = loading
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const check = () =>
      supabase
        .from('telegram_links')
        .select('chat_id')
        .eq('profile_id', me.id)
        .maybeSingle()
        .then(({ data }) => setLinked(Boolean(data?.chat_id)));
    check();
    // Coming back from Telegram after tapping Start
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [me.id]);

  if (!BOT || isDemo) return null;

  function connect() {
    const code = randomCode();
    // Open Telegram right in the tap (iOS blocks it later); the code is saved long before she taps Start.
    window.open(`https://t.me/${BOT}?start=${code}`, '_blank');
    setWaiting(true);
    supabase.from('telegram_links').upsert({ profile_id: me.id, link_code: code, chat_id: null }).then(() => {});
  }

  async function disconnect() {
    await supabase.from('telegram_links').delete().eq('profile_id', me.id);
    setLinked(false);
  }

  return (
    <FieldGroup
      title="Telegram"
      footer={
        linked
          ? `Pets from ${partner?.name ?? 'your friend'} arrive in Telegram from @${BOT}.`
          : waiting
            ? 'Tap Start in Telegram, then come back here.'
            : `Get every pet ${partner?.name ?? 'your friend'} sends as a Telegram message too.`
      }
    >
      <li>
        <button type="button" onClick={linked ? disconnect : connect} className={`h-12 w-full px-4 text-start text-body ${linked ? 'text-danger' : 'text-primary'}`}>
          {linked === null ? '…' : linked ? 'Disconnect Telegram' : 'Connect Telegram'}
        </button>
      </li>
    </FieldGroup>
  );
}

function Accent() {
  const { me, refresh } = useSession();
  return (
    <FieldGroup title="Accent color" footer="Just for you — she picks her own.">
      <li className="px-4 py-3">
        <AccentSwatches
          value={parseTheme(me).accent}
          onChange={async (accent) => {
            applyAccent(accent);
            await saveTheme(me, { accent });
            await refresh();
          }}
        />
      </li>
    </FieldGroup>
  );
}

function Location() {
  const { me, refresh } = useSession();
  const auto = me.notify_prefs?.auto_location !== false;
  const [status, setStatus] = useState(null);
  return (
    <FieldGroup title="Location" footer={status ?? `Home shows where each of you is: city, time, weather and the distance between you. Now: ${me.city ?? 'not set'}.`}>
      <li>
        <button
          type="button"
          onClick={async () => {
            await supabase.from('profiles').update({ notify_prefs: { ...me.notify_prefs, auto_location: !auto } }).eq('id', me.id);
            await refresh();
          }}
          className="flex min-h-12 w-full items-center gap-3 border-b border-text-secondary/20 px-4 text-start"
        >
          <span className="flex-1 text-body">Update my city automatically</span>
          <span className="pointer-events-none">
            <Toggle component="span" checked={auto} readOnly />
          </span>
        </button>
      </li>
      <li>
        <button
          type="button"
          onClick={async () => {
            setStatus('Finding you…');
            try {
              const city = await syncLocation(me, { force: true });
              await refresh();
              setStatus(city ? `Updated: you’re in ${city}.` : 'Couldn’t tell the city from here.');
            } catch {
              setStatus('Location isn’t allowed. iPhone Settings → Privacy → Location Services → Safari Websites (or Us) → While Using.');
            }
          }}
          className="h-12 w-full px-4 text-start text-body text-primary"
        >
          Use my current location now
        </button>
      </li>
    </FieldGroup>
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

      <Accent />

      <Location />

      <Notifications />
      <Telegram />
      {BOT && !isDemo && <TelegramFriends />}
      <Currency />

      <FieldGroup
        title="Demo"
        footer={
          isDemo
            ? 'You’re looking at sample data. Changes stay on this phone; turning demo off brings back your real account.'
            : 'Fill the app with sample pets, plans, gifts and places to look around. Your real data isn’t touched.'
        }
      >
        <li>
          <button type="button" onClick={isDemo ? disableDemo : enableDemo} className="flex min-h-12 w-full items-center gap-3 px-4 text-start">
            <span className="flex-1 text-body">Demo data</span>
            <span className="pointer-events-none">
              <Toggle component="span" checked={isDemo} readOnly />
            </span>
          </button>
        </li>
      </FieldGroup>

      <FieldGroup title="Account" footer={isDemo ? 'Demo account' : session?.user.email}>
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
