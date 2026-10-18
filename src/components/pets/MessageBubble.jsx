'use client';

import { useRef, useState } from 'react';
import { HeartFill, Paw, PlayFill } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { addHeart } from '@/lib/pets';

const DOUBLE_TAP_MS = 280;
const LONG_PRESS_MS = 450;

const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Long press opens the menu; returns props to spread on the pressable element. */
function useLongPress(onLongPress) {
  const timer = useRef(null);
  const start = useRef(null);
  const fired = useRef(false);
  const cancel = () => clearTimeout(timer.current);
  return {
    fired,
    handlers: {
      onPointerDown: (e) => {
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = setTimeout(() => {
          fired.current = true;
          navigator.vibrate?.(10);
          onLongPress();
        }, LONG_PRESS_MS);
      },
      onPointerMove: (e) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e) => e.preventDefault(),
    },
  };
}

function MediaGrid({ media, onOpen, onDoubleTap, longPress }) {
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const singleTap = useRef(null);

  function onTap(i, e) {
    if (longPress.fired.current) return;
    if (e.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(singleTap.current);
      lastTap.current = 0;
      setBurst((b) => b + 1);
      onDoubleTap();
      return;
    }
    lastTap.current = e.timeStamp;
    // Wait to see whether a second tap follows before opening fullscreen.
    singleTap.current = setTimeout(() => onOpen(i), DOUBLE_TAP_MS);
  }

  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;

  return (
    <div className={`relative grid gap-0.5 ${shown.length > 1 ? 'grid-cols-2' : ''}`}>
      {shown.map((m, i) => (
        <button
          key={m.id}
          type="button"
          onClick={(e) => onTap(i, e)}
          {...longPress.handlers}
          className={`relative overflow-hidden bg-surface-2 ${shown.length === 1 ? 'aspect-[4/5]' : 'aspect-square'} ${
            shown.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : ''
          }`}
        >
          {m.type === 'video' ? (
            <>
              <video src={`${m.src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <PlayFill className="absolute inset-0 m-auto text-[36px] text-white drop-shadow" />
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover select-none" />
          )}
          {extra > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-title font-semibold text-white">
              +{extra}
            </span>
          )}
        </button>
      ))}
      {burst > 0 && (
        <span
          key={burst}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-white drop-shadow-lg [animation:heart-burst_700ms_ease-out_forwards]"
        >
          <HeartFill className="text-[80px]" />
        </span>
      )}
    </div>
  );
}

function ReactionPill({ reactions, mine }) {
  if (!reactions.length) return null;
  const counts = reactions.reduce((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] ?? 0) + 1 }), {});
  return (
    <span
      className={`-mt-2 inline-flex items-center gap-0.5 rounded-full border-2 border-bg bg-surface-2 px-1.5 py-0.5 text-caption ${
        mine ? 'self-end me-2' : 'self-start ms-2'
      }`}
    >
      {Object.entries(counts).map(([emoji, n]) => (
        <span key={emoji}>
          {emoji}
          {n > 1 && <b className="ms-0.5">{n}</b>}
        </span>
      ))}
    </span>
  );
}

/**
 * One chat message. Mine on the right in the accent color, hers on the left.
 * Tap photo = fullscreen, double tap = heart, long press = reactions & delete.
 */
export default function MessageBubble({ post, pets, showAuthor, onOpenMedia, onMenu, onComments }) {
  const { me, partner } = useSession();
  const mine = post.authorId === me.id;
  const author = mine ? me : partner;
  const tagged = pets.filter((p) => post.catIds.includes(p.id)).map((p) => p.name);
  const longPress = useLongPress(() => onMenu(post));
  const hasMedia = post.media.length > 0;

  return (
    <div className={`flex items-end gap-2 px-3 ${mine ? 'flex-row-reverse' : ''} ${showAuthor ? 'mt-3' : 'mt-1'}`}>
      {!mine && (
        <span className={`w-8 shrink-0 ${showAuthor ? '' : 'invisible'}`}>
          <Avatar who="her" name={author?.name} src={author?.avatar} />
        </span>
      )}
      <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        <div
          {...(hasMedia ? {} : longPress.handlers)}
          // A plain tap on the text opens the menu too (react, copy, delete) — long press isn't obvious.
          onClick={hasMedia ? undefined : () => !longPress.fired.current && onMenu(post)}
          className={`overflow-hidden rounded-[20px] select-none ${hasMedia ? 'w-64' : ''} ${
            mine ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md bg-surface text-text'
          }`}
        >
          {hasMedia && (
            <MediaGrid
              media={post.media}
              onOpen={(i) => onOpenMedia(post.media, i)}
              onDoubleTap={() => addHeart(post, me)}
              longPress={longPress}
            />
          )}
          {(post.caption || tagged.length > 0) && (
            <div className="px-3.5 py-2" onClick={hasMedia ? () => onMenu(post) : undefined}>
              {tagged.length > 0 && (
                <p className={`flex items-center gap-1 text-caption font-semibold ${mine ? 'text-white/80' : 'text-text-secondary'}`}>
                  <Paw className="text-[12px]" />
                  {tagged.join(' & ')}
                </p>
              )}
              {post.caption && <p className="text-body break-words whitespace-pre-wrap">{post.caption}</p>}
            </div>
          )}
        </div>
        <ReactionPill reactions={post.reactions} mine={mine} />
        {/* Instagram-style: time · Reply, and "View N comments" once there are some */}
        <span className={`mt-0.5 flex items-center gap-3 px-1 text-[12px] text-text-secondary ${mine ? 'flex-row-reverse' : ''}`}>
          <span>{timeOf(post.createdAt)}</span>
          <button type="button" onClick={() => onComments(post)} className="-my-2 py-2 font-semibold active:opacity-50">
            Reply
          </button>
          {post.commentCount > 0 && (
            <button type="button" onClick={() => onComments(post)} className="-my-2 py-2 active:opacity-50">
              {post.commentCount === 1 ? 'View 1 comment' : `View ${post.commentCount} comments`}
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
