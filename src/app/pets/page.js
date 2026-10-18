'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import NextLink from '@/components/AppLink';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel } from 'konsta/react';
import { ArrowUpCircleFill, Camera, FlameFill, Paw, Plus } from 'framework7-icons/react';
import Screen from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { useSession } from '@/components/SessionProvider';
import MessageBubble from '@/components/pets/MessageBubble';
import MediaViewer from '@/components/pets/MediaViewer';
import UploadSheet, { useMediaPicker } from '@/components/pets/UploadSheet';
import CommentsSheet from '@/components/pets/CommentsSheet';
import { Trophy } from '@/components/pets/TrophyCard';
import { usePetsOfDay } from '@/lib/petOfDay';
import { REACTIONS, createPost, deleteMediaItem, deletePost, pairStreak, toggleReaction, usePets, useFeed } from '@/lib/pets';
import { dayKey } from '@/lib/dates';

const NO_MESSAGES = [];

// Full-screen chat: no tabbar, the composer sits right above the home indicator.
const COMPOSER_BOTTOM = 'bottom-[calc(var(--k-safe-area-bottom)+10px)]';

function dayLabel(iso) {
  const key = dayKey(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (key === dayKey(today)) return 'Today';
  if (key === dayKey(yesterday)) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Pinned under the header so the pets stay in reach while chatting. Pets are added in the profile. */
function PetsRow({ pets, loading }) {
  return (
    <div className="no-scrollbar -mx-4 flex w-[calc(100%+2rem)] items-center gap-2 overflow-x-auto px-4">
      {loading
        ? [0, 1, 2].map((i) => <div key={i} className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-surface-2" />)
        : !pets.length ? (
            <NextLink href="/profile/me" className="flex h-10 items-center rounded-full bg-surface px-4 text-subhead text-primary">
              Add your pets in your profile
            </NextLink>
          ) : pets.map((pet) => (
            <NextLink
              key={pet.id}
              href={`/pets/${pet.id}`}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-ios-light-glass py-1 ps-1 pe-3.5 shadow-ios-light-glass backdrop-blur-lg dark:bg-ios-dark-glass dark:shadow-ios-dark-glass"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-text-secondary">
                {pet.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pet.cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Paw className="text-[16px]" />
                )}
              </span>
              <span className="text-subhead font-semibold">{pet.name}</span>
            </NextLink>
          ))}
    </div>
  );
}

function Composer({ onPhoto, onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function send(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText('');
    try {
      await onSend(value);
    } catch {
      setText(value);
    }
    setSending(false);
  }

  return (
    <form
      onSubmit={send}
      className={`app-bottom-bar chat-composer fixed inset-x-0 z-20 mx-4 flex items-center gap-1 rounded-full bg-ios-light-glass p-1 shadow-ios-light-glass backdrop-blur-lg dark:bg-ios-dark-glass dark:shadow-ios-dark-glass ${COMPOSER_BOTTOM}`}
    >
      <button type="button" onClick={onPhoto} aria-label="Send photo" className="flex h-11 w-11 shrink-0 items-center justify-center text-primary">
        <Camera className="text-[24px]" />
      </button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Message"
        // Once the keyboard is up, keep the latest messages right above the input.
        onFocus={() =>
          setTimeout(() => {
            const page = document.querySelector('.chat-page');
            page?.scrollTo({ top: page.scrollHeight, behavior: 'smooth' });
          }, 350)
        }
        enterKeyHint="send"
        className="h-10 min-w-0 flex-1 rounded-full bg-surface-2/70 px-4 text-body outline-none placeholder:text-text-secondary"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={!text.trim() || sending}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-primary disabled:opacity-30"
      >
        <ArrowUpCircleFill className="text-[30px]" />
      </button>
    </form>
  );
}

export default function PetsPage() {
  const { me, partner, pair } = useSession();
  const pets = usePets();
  const feed = useFeed();
  const [uploadFiles, setUploadFiles] = useState(null);
  const [viewer, setViewer] = useState(null); // { items, index }
  const [menuPost, setMenuPost] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [commentsFor, setCommentsFor] = useState(null); // the message whose comments are open
  const picker = useMediaPicker(setUploadFiles);
  const lastCount = useRef(0);

  const petList = pets.data ?? [];
  const messages = feed.data ?? NO_MESSAGES;
  const winners = usePetsOfDay();
  const winnersByDay = Object.fromEntries((winners.data ?? []).map((w) => [w.day, w]));
  const streak = pairStreak(messages, me, partner);

  // Open at the latest message, and follow new ones like a chat.
  useEffect(() => {
    const page = document.querySelector('.k-page');
    if (!page || messages.length === lastCount.current) return;
    const first = lastCount.current === 0;
    const nearBottom = page.scrollHeight - page.scrollTop - page.clientHeight < 300;
    lastCount.current = messages.length;
    if (first || nearBottom || messages.at(-1)?.authorId === me.id) {
      requestAnimationFrame(() => page.scrollTo({ top: page.scrollHeight, behavior: first ? 'instant' : 'smooth' }));
    }
  }, [messages, me.id]);

  return (
    <Screen className="chat-page pb-[calc(var(--k-safe-area-bottom)+80px)]">
      <InnerNavbar
        large={false}
        title={
          <span className="inline-flex items-center gap-1.5">
            Pets
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-together/15 px-2 py-0.5 text-subhead font-semibold text-together">
                <FlameFill className="text-[14px]" />
                {streak}
              </span>
            )}
          </span>
        }
        subnavbar={<PetsRow pets={petList} loading={pets.loading} />}
      />
      {picker.element}

      {feed.loading ? (
        <div className="space-y-3 px-3 pt-4">
          <div className="h-48 w-56 animate-pulse rounded-[20px] bg-surface-2" />
          <div className="ms-auto h-10 w-40 animate-pulse rounded-[20px] bg-surface-2" />
          <div className="h-10 w-52 animate-pulse rounded-[20px] bg-surface-2" />
        </div>
      ) : messages.length === 0 ? (
        <div className="px-8 pt-16 text-center">
          <p className="text-body font-semibold">Send the first pet of the day</p>
          <p className="mt-1 text-subhead text-text-secondary">Photos, videos and messages about your pets live here.</p>
        </div>
      ) : (
        messages.map((post, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(post.createdAt);
          const next = messages[i + 1];
          const lastOfDay = !next || dayKey(next.createdAt) !== dayKey(post.createdAt);
          const winner = lastOfDay && winnersByDay[dayKey(post.createdAt)];
          return (
            <Fragment key={post.id}>
              {newDay && <p className="pt-5 pb-1 text-center text-caption font-semibold text-text-secondary">{dayLabel(post.createdAt)}</p>}
              <MessageBubble
                post={post}
                pets={petList}
                showAuthor={newDay || prev.authorId !== post.authorId}
                onOpenMedia={(items, index) => setViewer({ items, index })}
                onMenu={setMenuPost}
                onComments={setCommentsFor}
              />
              {winner && (
                <NextLink href="/pets/hall" className="mx-auto mt-4 flex w-fit items-center gap-2.5 rounded-full bg-together/15 py-1.5 ps-1.5 pe-4">
                  {winner.src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={winner.src} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-together" />
                  )}
                  <Trophy className="h-5 w-5 text-together" />
                  <span className="text-subhead font-semibold">
                    Pet of the day: <b className="font-extrabold">{winner.name}</b>
                  </span>
                </NextLink>
              )}
            </Fragment>
          );
        })
      )}

      <Composer onPhoto={picker.open} onSend={(caption) => createPost({ caption, me, pair }).then(feed.reload)} />

      <UploadSheet
        files={uploadFiles}
        cats={petList}
        onClose={() => {
          setUploadFiles(null);
          feed.reload();
        }}
      />
      <CommentsSheet
        postId={commentsFor?.id ?? null}
        postAuthorId={commentsFor?.authorId}
        onClose={() => {
          setCommentsFor(null);
          feed.reload();
        }}
      />
      <MediaViewer
        opened={Boolean(viewer)}
        items={viewer?.items ?? []}
        startIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
        canDelete={(item) => item.authorId === me.id}
        onDelete={async (item) => {
          await deleteMediaItem(item, messages.find((p) => p.id === item.postId));
          feed.reload();
        }}
      />

      {/* Long press: react or delete */}
      <Actions opened={Boolean(menuPost)} onBackdropClick={() => setMenuPost(null)}>
        <ActionsGroup>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-3">
            {REACTIONS.map((emoji) => {
              const active = menuPost?.reactions.some((r) => r.emoji === emoji && r.author_id === me.id);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={async () => {
                    const post = menuPost;
                    setMenuPost(null);
                    await toggleReaction(post, emoji, me);
                    feed.reload();
                  }}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[26px] ${active ? 'bg-accent/20' : 'bg-surface-2'}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
          <ActionsButton
            onClick={() => {
              setCommentsFor(menuPost);
              setMenuPost(null);
            }}
          >
            {menuPost?.commentCount ? `Comments (${menuPost.commentCount})` : 'Comment'}
          </ActionsButton>
          {menuPost?.caption && (
            <ActionsButton
              onClick={() => {
                navigator.clipboard.writeText(menuPost.caption);
                setMenuPost(null);
              }}
            >
              Copy text
            </ActionsButton>
          )}
          {menuPost?.authorId === me.id && (
            <ActionsButton
              className="text-danger!"
              onClick={() => {
                setConfirmDelete(menuPost);
                setMenuPost(null);
              }}
            >
              Delete
            </ActionsButton>
          )}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setMenuPost(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <Actions opened={Boolean(confirmDelete)} onBackdropClick={() => setConfirmDelete(null)}>
        <ActionsGroup>
          <ActionsLabel>The message and its photos will be deleted for both of you.</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              const post = confirmDelete;
              setConfirmDelete(null);
              await deletePost(post);
              feed.reload();
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirmDelete(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </Screen>
  );
}
