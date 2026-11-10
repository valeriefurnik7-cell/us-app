'use client';

import { useEffect, useRef, useState } from 'react';
import { BlockFooter, BlockTitle, Chip, Link, Sheet, Toolbar } from 'konsta/react';
import { PlayFill, Plus, Xmark } from 'framework7-icons/react';
import { useSession } from '../SessionProvider';
import { createPost } from '@/lib/pets';
import { errorMessage } from '@/lib/supabase';

const MAX_VIDEO_MB = 50;

const tooBig = (f) => f.type.startsWith('video/') && f.size > MAX_VIDEO_MB * 1024 * 1024;
const MAX_FILES = 10; // Telegram albums stop at 10 too

/** The picked photos as a grid: × removes one, the last tile adds more. */
function PhotoGrid({ files, onRemove, onAdd, disabled }) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    Promise.resolve().then(() => setUrls(next));
    return () => next.forEach(URL.revokeObjectURL);
  }, [files]);

  return (
    <div className="grid grid-cols-3 gap-1.5 px-4">
      {files.map((f, i) => (
        <div key={`${f.name}-${f.size}-${i}`} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
          {urls[i] &&
            (f.type.startsWith('video/') ? (
              <>
                <video src={`${urls[i]}#t=0.1`} muted playsInline className="h-full w-full object-cover" />
                <PlayFill className="absolute inset-0 m-auto text-[28px] text-white drop-shadow" />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[i]} alt="" className="h-full w-full object-cover" />
            ))}
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label="Remove"
              className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"
            >
              <Xmark className="text-[13px]" />
            </button>
          )}
        </div>
      ))}
      {files.length < MAX_FILES && !disabled && (
        <button
          type="button"
          onClick={onAdd}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-text-secondary/30 text-primary active:bg-surface-2"
        >
          <Plus className="text-[26px]" />
          <span className="text-caption font-semibold">{files.length ? 'Add more' : 'Add photos'}</span>
        </button>
      )}
    </div>
  );
}

function UploadForm({ initialFiles, cats, defaultCatId, onClose }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const [files, setFiles] = useState(() => initialFiles.filter((f) => !tooBig(f)).slice(0, MAX_FILES));
  const [catIds, setCatIds] = useState(defaultCatId ? [defaultCatId] : cats.length === 1 ? [cats[0].id] : []);
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(initialFiles.some(tooBig) ? `Videos up to ${MAX_VIDEO_MB} MB` : null);

  function pick(e) {
    const picked = [...e.target.files];
    e.target.value = '';
    if (!picked.length) return;
    setError(picked.some(tooBig) ? `Videos up to ${MAX_VIDEO_MB} MB` : null);
    // Added to what's already there, not instead of it
    setFiles((current) => [...current, ...picked.filter((f) => !tooBig(f))].slice(0, MAX_FILES));
  }

  const toggleCat = (id) => setCatIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  async function post() {
    setError(null);
    setProgress(0);
    try {
      await createPost({ files, catIds, caption, me, pair, onProgress: setProgress });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setProgress(null);
    }
  }

  const busy = progress !== null;
  const videos = files.filter((f) => f.type.startsWith('video/')).length;
  const what = videos === files.length ? (files.length === 1 ? 'video' : 'videos') : files.length === 1 ? 'photo' : 'photos';
  const label = busy
    ? progress < 1
      ? `Sending… ${Math.round(progress * files.length)} of ${files.length}`
      : 'Almost there…'
    : `Send ${files.length > 1 ? `${files.length} ` : ''}${what}`;

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={onClose} className={busy ? 'pointer-events-none opacity-40' : ''}>
          Cancel
        </Link>
        <span className="text-body font-semibold">New post</span>
        <span className="w-14" />
      </Toolbar>

      <div className="max-h-[75vh] overflow-auto pt-3">
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={pick} />
        <PhotoGrid
          files={files}
          disabled={busy}
          onAdd={() => input.current?.click()}
          onRemove={(i) => setFiles((current) => current.filter((_, j) => j !== i))}
        />

        {cats.length > 0 && (
          <>
            <BlockTitle>Who’s in it</BlockTitle>
            <div className="mt-2 flex flex-wrap gap-2 px-4">
              {cats.map((c) => (
                <Chip
                  key={c.id}
                  component="button"
                  onClick={() => toggleCat(c.id)}
                  className={`h-9 px-3 ${catIds.includes(c.id) ? 'bg-accent! text-white!' : ''}`}
                >
                  {c.name}
                </Chip>
              ))}
            </div>
          </>
        )}

        <div className="px-4 pt-5">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption…"
            enterKeyHint="done"
            className="h-11 w-full rounded-full bg-surface-2 px-4 text-body outline-none placeholder:text-text-secondary"
          />
        </div>
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}

        <div className="px-4 pt-4 pb-safe-4">
          <button
            type="button"
            onClick={post}
            disabled={busy || !files.length}
            className="relative h-12 w-full overflow-hidden rounded-full bg-accent text-body font-semibold text-white disabled:opacity-60"
          >
            {busy && <span className="absolute inset-y-0 start-0 bg-white/25 transition-[width] duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />}
            <span className="relative">{files.length ? label : 'Add a photo first'}</span>
          </button>
        </div>
      </div>
    </>
  );
}

/** Hidden picker; call `open()` straight from a tap (iOS only opens pickers from a user gesture). */
export function useMediaPicker(onPicked) {
  const input = useRef(null);
  const element = (
    <input
      ref={input}
      type="file"
      accept="image/*,video/*"
      multiple
      hidden
      onChange={(e) => {
        const files = [...e.target.files];
        e.target.value = '';
        if (files.length) onPicked(files);
      }}
    />
  );
  return { open: () => input.current?.click(), element };
}

/** files: the photos picked before opening; null = closed. */
export default function UploadSheet({ files, cats, defaultCatId, onClose }) {
  return (
    <Sheet opened={Boolean(files)} onBackdropClick={onClose} className="w-full">
      {files && <UploadForm initialFiles={files} cats={cats} defaultCatId={defaultCatId} onClose={onClose} />}
    </Sheet>
  );
}
