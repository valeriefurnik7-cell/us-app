'use client';

import { useEffect, useRef, useState } from 'react';
import { Popup } from 'konsta/react';
import { SquareArrowUp, Xmark } from 'framework7-icons/react';

// iOS saves to Photos through the share sheet ("Save Image" / "Save Video").
async function saveToPhotos(item) {
  const blob = await fetch(item.src).then((r) => r.blob());
  const ext = item.type === 'video' ? 'mp4' : 'jpg';
  const file = new File([blob], `cat.${ext}`, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Fullscreen photos/videos, swipe between them. items: [{ src, type }] */
export default function MediaViewer({ items, startIndex = 0, opened, onClose }) {
  const scroller = useRef(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (!opened || !scroller.current) return;
    scroller.current.scrollTo({ left: startIndex * scroller.current.clientWidth });
  }, [opened, startIndex]);

  const current = items[index] ?? items[0];

  return (
    <Popup opened={opened} onBackdropClick={onClose} className="h-full! max-h-none! w-full! max-w-none! rounded-none! bg-black!">
      <div className="relative h-full w-full bg-black">
        <div
          ref={scroller}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {items.map((item, i) => (
            <div key={item.src ?? i} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
              {item.type === 'video' ? (
                <video src={item.src} controls playsInline className="max-h-full max-w-full" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt="" className="max-h-full max-w-full object-contain" />
              )}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 top-0 flex justify-between px-4 pt-[max(16px,var(--k-safe-area-top))]">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md"
          >
            <Xmark className="text-[20px]" />
          </button>
          {current && (
            <button
              type="button"
              aria-label="Save"
              onClick={() => saveToPhotos(current)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md"
            >
              <SquareArrowUp className="text-[20px]" />
            </button>
          )}
        </div>

        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-[max(24px,var(--k-safe-area-bottom))] text-center text-subhead text-white/80">
            {index + 1} / {items.length}
          </div>
        )}
      </div>
    </Popup>
  );
}
