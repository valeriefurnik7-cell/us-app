'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, Segmented, SegmentedButton, Sheet, Toolbar } from 'konsta/react';
import { CameraFill, Checkmark, Trash } from 'framework7-icons/react';
import { useSession } from './SessionProvider';
import { useTheme } from './ThemeProvider';
import { ACCENTS, applyAccent, parseTheme, saveTheme } from '@/lib/appearance';
import { removeMedia, uploadMedia } from '@/lib/media';

const MODES = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'Auto' },
];

/** Applies the pair's accent color whenever it changes (also on the other phone). */
export function AccentFromPair() {
  const { pair } = useSession();
  const accent = parseTheme(pair).accent;
  useEffect(() => {
    applyAccent(accent);
  }, [accent]);
  return null;
}

export function AccentSwatches({ value, onChange }) {
  const { resolved } = useTheme();
  return (
    <div className="flex gap-3">
      {ACCENTS.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-label={a.label}
          onClick={() => onChange(a.id)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white"
          style={{ background: resolved === 'dark' ? a.dark : a.light }}
        >
          {value === a.id && <Checkmark className="text-[18px]" />}
        </button>
      ))}
    </div>
  );
}

function Look({ onClose }) {
  const { pair, refresh } = useSession();
  const { mode, setMode } = useTheme();
  const theme = parseTheme(pair);
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  async function update(patch) {
    if (patch.accent) applyAccent(patch.accent); // instant, before the round trip
    await saveTheme(pair, patch);
    await refresh();
  }

  async function setPhoto(file) {
    setBusy(true);
    const path = await uploadMedia(file, pair.id, 'theme');
    if (theme.cardPhoto) await removeMedia([theme.cardPhoto]);
    await update({ cardPhoto: path });
    setBusy(false);
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <span className="ps-2 text-body font-semibold">Our look</span>
        <Link toolbar onClick={onClose}>
          <b>Done</b>
        </Link>
      </Toolbar>
      <div className="px-4 pb-safe-8">
        <h3 className="mt-2 mb-2 px-1 text-caption font-semibold tracking-wide text-text-secondary uppercase">Theme · this phone</h3>
        <Segmented strong rounded>
          {MODES.map((m) => (
            <SegmentedButton key={m.id} strong rounded active={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </SegmentedButton>
          ))}
        </Segmented>

        <h3 className="mt-6 mb-2 px-1 text-caption font-semibold tracking-wide text-text-secondary uppercase">Accent · for both of us</h3>
        <AccentSwatches value={theme.accent} onChange={(accent) => update({ accent })} />

        <h3 className="mt-6 mb-2 px-1 text-caption font-semibold tracking-wide text-text-secondary uppercase">“Us” card background</h3>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files[0];
            e.target.value = '';
            if (file) setPhoto(file);
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-surface-2 text-body font-semibold disabled:opacity-50"
          >
            <CameraFill className="text-[18px] text-primary" />
            {busy ? 'Uploading…' : theme.cardPhoto ? 'Change photo' : 'Choose a photo'}
          </button>
          {theme.cardPhoto && (
            <button
              type="button"
              aria-label="Remove photo"
              onClick={async () => {
                await removeMedia([theme.cardPhoto]);
                await update({ cardPhoto: null });
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-danger"
            >
              <Trash className="text-[18px]" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function AppearanceSheet({ opened, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="w-full">
      {opened && <Look onClose={onClose} />}
    </Sheet>
  );
}
