'use client';

import { useRef, useState } from 'react';
import { ChatBubble, Ellipsis, HeartFill, PlayFill } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { REACTIONS, addHeart, toggleReaction } from '@/lib/cats';
import { timeAgo } from '@/lib/dates';

const DOUBLE_TAP_MS = 280;

function Carousel({ media, onOpen, onDoubleTap }) {
  const [index, setIndex] = useState(0);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const singleTap = useRef(null);

  function onTap(i, e) {
    const now = e.timeStamp;
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      clearTimeout(singleTap.current);
      lastTap.current = 0;
      setBurst((b) => b + 1);
      onDoubleTap();
      return;
    }
    lastTap.current = now;
    // Wait to see whether a second tap follows before opening fullscreen.
    singleTap.current = setTimeout(() => onOpen(i), DOUBLE_TAP_MS);
  }

  return (
    <div className="relative">
      <div
        className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto bg-surface-2"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {media.map((m, i) => (
          <button key={m.id} type="button" className="relative h-full w-full shrink-0 snap-center" onClick={(e) => onTap(i, e)}>
            {m.type === 'video' ? (
              <>
                <video src={`${m.src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow">
                  <PlayFill className="text-[44px]" />
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.src} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>

      {burst > 0 && (
        <span
          key={burst}
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-white drop-shadow-lg [animation:heart-burst_700ms_ease-out_forwards]"
        >
          <HeartFill className="text-[96px]" />
        </span>
      )}

      {media.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {media.map((m, i) => (
            <span key={m.id} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/50'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, cats, onOpenMedia, onOpenComments, onMenu }) {
  const { me, partner } = useSession();
  const isMine = post.authorId === me.id;
  const author = isMine ? me : partner;
  const postCats = cats.filter((c) => post.catIds.includes(c.id));

  return (
    <article className="mx-4 mt-3 overflow-hidden rounded-card bg-surface">
      <header className="flex items-center gap-2 px-3 py-2">
        <Avatar who={isMine ? 'me' : 'her'} name={author?.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-subhead font-semibold">{postCats.map((c) => c.name).join(' & ') || author?.name}</p>
          <p className="text-caption text-text-secondary">
            {author?.name} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {isMine && (
          <button type="button" aria-label="More" onClick={() => onMenu(post)} className="flex h-11 w-11 items-center justify-center text-text-secondary">
            <Ellipsis className="text-[22px]" />
          </button>
        )}
      </header>

      {post.media.length > 0 && (
        <Carousel media={post.media} onOpen={(i) => onOpenMedia(post.media, i)} onDoubleTap={() => addHeart(post, me)} />
      )}

      <div className="px-3 pt-2 pb-3">
        <div className="flex items-center gap-1">
          {REACTIONS.map((emoji) => {
            const count = post.reactions.filter((r) => r.emoji === emoji).length;
            const mine = post.reactions.some((r) => r.emoji === emoji && r.author_id === me.id);
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleReaction(post, emoji, me)}
                className={`flex h-9 min-w-11 items-center justify-center gap-1 rounded-full px-2.5 text-subhead transition-colors ${
                  mine ? 'bg-accent/15 text-primary' : 'bg-surface-2'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-semibold">{count}</span>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onOpenComments(post.id)}
            className="ms-auto flex h-9 min-w-11 items-center justify-center gap-1 rounded-full px-2.5 text-subhead text-text-secondary"
          >
            <ChatBubble className="text-[20px]" />
            {post.commentCount > 0 && <span className="font-semibold">{post.commentCount}</span>}
          </button>
        </div>
        {post.caption && <p className="mt-2 text-body break-words">{post.caption}</p>}
      </div>
    </article>
  );
}

export function PostSkeleton() {
  return (
    <div className="mx-4 mt-3 overflow-hidden rounded-card bg-surface">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2" />
        <div className="h-4 w-32 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="aspect-[4/5] animate-pulse bg-surface-2" />
      <div className="h-14" />
    </div>
  );
}
