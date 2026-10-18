'use client';

import { use, useState } from 'react';
import { Block, BlockTitle, Button, List, ListItem } from 'konsta/react';
import { Paw, PlayFill } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { useSession } from '@/components/SessionProvider';
import PetSheet, { FAVORITES } from '@/components/pets/PetSheet';
import MediaViewer from '@/components/pets/MediaViewer';
import UploadSheet, { useMediaPicker } from '@/components/pets/UploadSheet';
import { SPECIES, petStreak, usePets, useFeed } from '@/lib/pets';
import { ageFrom } from '@/lib/dates';

function Stat({ value, label }) {
  return (
    <div className="flex-1 rounded-card bg-surface px-4 py-3 text-center">
      <p className="text-title font-bold">{value}</p>
      <p className="text-caption text-text-secondary">{label}</p>
    </div>
  );
}

export default function PetPage({ params }) {
  const { id } = use(params);
  const { me, partner } = useSession();
  const cats = usePets();
  const feed = useFeed();
  const [editing, setEditing] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [uploadFiles, setUploadFiles] = useState(null);
  const picker = useMediaPicker(setUploadFiles);

  const cat = cats.data?.find((c) => c.id === id);
  const posts = (feed.data ?? []).filter((p) => p.catIds.includes(id));
  const gallery = posts.flatMap((p) => p.media);
  const photoCount = gallery.filter((m) => m.type === 'photo').length;

  if (cats.loading) {
    return (
      <Screen>
        <InnerNavbar title="" />
        <div className="mx-4 aspect-square animate-pulse rounded-card bg-surface-2" />
      </Screen>
    );
  }
  if (!cat) {
    return (
      <Screen>
        <InnerNavbar title="Pet" />
        <EmptyState title="This pet is gone" />
      </Screen>
    );
  }

  const isMine = cat.owner_id === me.id;
  const age = ageFrom(cat.birthday);
  const favorites = FAVORITES.filter((f) => cat.favorites?.[f.key]);

  return (
    <Screen>
      <InnerNavbar title={cat.name} />
      {picker.element}

      <div className="mx-4 mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-card bg-surface-2 text-text-secondary">
        {cat.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cat.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <Paw className="text-[72px]" />
        )}
      </div>

      <List strong inset>
        <ListItem title="Whose" after={isMine ? 'Mine' : partner?.name ?? 'Hers'} />
        <ListItem title="Species" after={SPECIES.find((s) => s.id === cat.species)?.label ?? 'Cat'} />
        {cat.breed && <ListItem title="Breed" after={cat.breed} />}
        {age && <ListItem title="Age" after={age} />}
        {cat.character && <ListItem title="Character" after={cat.character} />}
      </List>

      {favorites.length > 0 && (
        <>
          <BlockTitle>Favorites</BlockTitle>
          <List strong inset>
            {favorites.map((f) => (
              <ListItem key={f.key} title={f.short} after={cat.favorites[f.key]} />
            ))}
          </List>
        </>
      )}

      <div className="mx-4 mt-6 flex gap-3">
        <Stat value={photoCount} label="photos all time" />
        <Stat value={petStreak(posts)} label="days in a row" />
      </div>

      <Block className="flex gap-2">
        <Button large rounded onClick={picker.open}>
          Add photo
        </Button>
        {isMine && (
          <Button large rounded tonal onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </Block>

      <BlockTitle>Gallery</BlockTitle>
      {feed.loading ? (
        <div className="mx-4 mt-2 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded bg-surface-2" />
          ))}
        </div>
      ) : gallery.length === 0 ? (
        <EmptyState title={`No photos of ${cat.name} yet`} />
      ) : (
        <div className="mx-4 mt-2 grid grid-cols-3 gap-1 overflow-hidden rounded-card">
          {gallery.map((m, i) => (
            <button key={m.id} type="button" className="relative aspect-square bg-surface-2" onClick={() => setViewerIndex(i)}>
              {m.type === 'video' ? (
                <>
                  <video src={`${m.src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <PlayFill className="absolute inset-0 m-auto text-[28px] text-white" />
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.src} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      <PetSheet opened={editing} pet={cat} onClose={() => setEditing(false)} onSaved={cats.reload} />
      <UploadSheet
        files={uploadFiles}
        cats={cats.data}
        defaultCatId={cat.id}
        onClose={() => {
          setUploadFiles(null);
          feed.reload();
        }}
      />
      <MediaViewer
        opened={viewerIndex !== null}
        items={gallery}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </Screen>
  );
}
