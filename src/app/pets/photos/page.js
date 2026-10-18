'use client';

import { useState } from 'react';
import { PlayFill } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { useLastMainScreen } from '@/components/AppShell';
import MediaViewer from '@/components/pets/MediaViewer';
import { deleteMediaItem, usePets, useFeed } from '@/lib/pets';
import { useSession } from '@/components/SessionProvider';

/** Every pet photo and video ever sent, newest first, filterable by pet. */
export default function PetPhotosPage() {
  const lastMain = useLastMainScreen();
  const { me } = useSession();
  const pets = usePets();
  const feed = useFeed();
  const [pet, setPet] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(null);

  const media = (feed.data ?? [])
    .filter((p) => !pet || p.catIds.includes(pet))
    .slice()
    .reverse()
    .flatMap((p) => p.media);

  return (
    <Screen>
      <InnerNavbar title="Pet photos" back={lastMain} />

      {(pets.data ?? []).length > 1 && (
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4">
          {[{ id: null, name: 'All' }, ...pets.data].map((p) => (
            <button
              key={p.id ?? 'all'}
              type="button"
              onClick={() => setPet(p.id)}
              className={`h-9 shrink-0 rounded-full px-3.5 text-subhead ${pet === p.id ? 'bg-accent text-white' : 'bg-surface'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {feed.loading ? (
        <div className="mx-4 grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded bg-surface" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <EmptyState title="No photos yet" text="Pet photos you send in the chat collect here" />
      ) : (
        <div className="mx-4 grid grid-cols-3 gap-1 overflow-hidden rounded-card">
          {media.map((m, i) => (
            <button key={m.id} type="button" onClick={() => setViewerIndex(i)} className="relative aspect-square bg-surface-2">
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

      <MediaViewer
        opened={viewerIndex !== null}
        items={media}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        canDelete={(item) => item.authorId === me.id}
        onDelete={async (item) => {
          await deleteMediaItem(item, feed.data.find((p) => p.id === item.postId));
          feed.reload();
        }}
      />
    </Screen>
  );
}
