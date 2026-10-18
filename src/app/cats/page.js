'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Chip } from 'konsta/react';
import { FlameFill, Paw, Plus } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import { useSession } from '@/components/SessionProvider';
import PostCard, { PostSkeleton } from '@/components/cats/PostCard';
import CommentsSheet from '@/components/cats/CommentsSheet';
import MediaViewer from '@/components/cats/MediaViewer';
import UploadSheet, { useMediaPicker } from '@/components/cats/UploadSheet';
import CatSheet from '@/components/cats/CatSheet';
import { deletePost, pairStreak, useCats, useFeed } from '@/lib/cats';

function CatCard({ cat, owner }) {
  return (
    <NextLink href={`/cats/${cat.id}`} className="w-28 shrink-0">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-card bg-surface-2 text-text-secondary">
        {cat.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cat.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <Paw className="text-[36px]" />
        )}
      </div>
      <p className="mt-1.5 truncate text-subhead font-semibold">{cat.name}</p>
      <p className="truncate text-caption text-text-secondary">{owner}</p>
    </NextLink>
  );
}

function AddCatCard({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-28 shrink-0 text-left">
      <div className="flex aspect-square items-center justify-center rounded-card border-2 border-dashed border-text-secondary/30 text-primary">
        <Plus className="text-[28px]" />
      </div>
      <p className="mt-1.5 text-subhead font-semibold text-primary">Add cat</p>
    </button>
  );
}

export default function CatsPage() {
  const { me, partner } = useSession();
  const cats = useCats();
  const feed = useFeed();
  const [filter, setFilter] = useState(null);
  const [uploadFiles, setUploadFiles] = useState(null);
  const [addingCat, setAddingCat] = useState(false);
  const [viewer, setViewer] = useState(null); // { items, index }
  const [commentsFor, setCommentsFor] = useState(null);
  const [menuPost, setMenuPost] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const picker = useMediaPicker(setUploadFiles);

  const catList = cats.data ?? [];
  const posts = feed.data ?? [];
  const visible = filter ? posts.filter((p) => p.catIds.includes(filter)) : posts;
  const streak = pairStreak(posts, me, partner);
  const ownerName = (cat) => (cat.owner_id === me.id ? 'My cat' : `${partner?.name ?? 'Her'}’s cat`);

  return (
    <Screen>
      <AppNavbar
        title="Cats"
        onAdd={picker.open}
        titleAccessory={
          streak > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-together/15 px-2 py-0.5 text-subhead font-semibold text-together">
              <FlameFill className="text-[16px]" />
              {streak}
            </span>
          )
        }
      />
      {picker.element}

      {/* Cat profiles */}
      <div className="no-scrollbar mt-2 flex gap-3 overflow-x-auto px-4 pb-1">
        {cats.loading
          ? [0, 1].map((i) => <div key={i} className="aspect-square w-28 shrink-0 animate-pulse rounded-card bg-surface-2" />)
          : catList.map((cat) => <CatCard key={cat.id} cat={cat} owner={ownerName(cat)} />)}
        {!cats.loading && <AddCatCard onClick={() => setAddingCat(true)} />}
      </div>

      {/* Filter by cat */}
      {catList.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
          {[{ id: null, name: 'All' }, ...catList].map((c) => (
            <Chip
              key={c.id ?? 'all'}
              component="button"
              onClick={() => setFilter(c.id)}
              className={`h-9 shrink-0 px-3 ${filter === c.id ? 'bg-accent! text-white!' : ''}`}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      {/* Feed */}
      {feed.loading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter ? 'No photos of this cat yet' : 'No cats in the feed yet'}
          text="Tap + to share the first photo"
        />
      ) : (
        visible.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            cats={catList}
            onOpenMedia={(items, index) => setViewer({ items, index })}
            onOpenComments={setCommentsFor}
            onMenu={setMenuPost}
          />
        ))
      )}

      <UploadSheet files={uploadFiles} cats={catList} defaultCatId={filter} onClose={() => {
          setUploadFiles(null);
          feed.reload();
        }}
      />
      <CatSheet opened={addingCat} cat={null} onClose={() => setAddingCat(false)} onSaved={cats.reload} />
      <CommentsSheet
        postId={commentsFor}
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
      />

      <Actions opened={Boolean(menuPost)} onBackdropClick={() => setMenuPost(null)}>
        <ActionsGroup>
          <ActionsButton
            className="text-danger!"
            onClick={() => {
              setConfirmDelete(menuPost);
              setMenuPost(null);
            }}
          >
            Delete post
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setMenuPost(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <Actions opened={Boolean(confirmDelete)} onBackdropClick={() => setConfirmDelete(null)}>
        <ActionsGroup>
          <ActionsLabel>The post and its photos will be deleted for both of you.</ActionsLabel>
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
