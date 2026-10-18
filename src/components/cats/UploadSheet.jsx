'use client';

import { useEffect, useRef, useState } from 'react';
import { BlockFooter, BlockTitle, Chip, Link, List, ListInput, Progressbar, Sheet, Toolbar } from 'konsta/react';
import { Camera, PlayFill } from 'framework7-icons/react';
import { useSession } from '../SessionProvider';
import { createPost } from '@/lib/cats';
import { errorMessage } from '@/lib/supabase';

const MAX_VIDEO_MB = 50;

function Previews({ files }) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    Promise.resolve().then(() => setUrls(next));
    return () => next.forEach(URL.revokeObjectURL);
  }, [files]);

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
      {files.map((f, i) => (
        <div key={i} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-control bg-surface-2">
          {urls[i] &&
            (f.type.startsWith('video/') ? (
              <>
                <video src={urls[i]} muted playsInline className="h-full w-full object-cover" />
                <PlayFill className="absolute inset-0 m-auto text-[28px] text-white" />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[i]} alt="" className="h-full w-full object-cover" />
            ))}
        </div>
      ))}
    </div>
  );
}

const tooBig = (f) => f.type.startsWith('video/') && f.size > MAX_VIDEO_MB * 1024 * 1024;

function UploadForm({ initialFiles, cats, defaultCatId, onClose }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const [files, setFiles] = useState(() => initialFiles.filter((f) => !tooBig(f)));
  const [catIds, setCatIds] = useState(defaultCatId ? [defaultCatId] : cats.length === 1 ? [cats[0].id] : []);
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(initialFiles.some(tooBig) ? `Videos up to ${MAX_VIDEO_MB} MB` : null);

  function pick(e) {
    const picked = [...e.target.files];
    if (!picked.length) return;
    setError(picked.some(tooBig) ? `Videos up to ${MAX_VIDEO_MB} MB` : null);
    setFiles(picked.filter((f) => !tooBig(f)));
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

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={onClose} className={busy ? 'pointer-events-none opacity-40' : ''}>
          Cancel
        </Link>
        <Link toolbar onClick={post} className={busy || !files.length ? 'pointer-events-none opacity-40' : ''}>
          <b>Post</b>
        </Link>
      </Toolbar>
      {busy && <Progressbar progress={progress} />}

      <div className="max-h-[75vh] overflow-auto pt-3 pb-safe-4">
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={pick} />
        {files.length ? (
          <Previews files={files} />
        ) : null}
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-control border border-dashed border-text-secondary/40 text-subhead text-primary"
          >
            <Camera className="text-[20px]" />
            {files.length ? 'Choose other photos' : 'Choose photos or videos'}
          </button>
        </div>

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

        <BlockTitle>Caption</BlockTitle>
        <List strong inset>
          <ListInput type="textarea" placeholder="Optional" value={caption} onChange={(e) => setCaption(e.target.value)} inputClassName="min-h-16" />
        </List>
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}
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
