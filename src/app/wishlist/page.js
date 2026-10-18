'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Segmented, SegmentedButton } from 'konsta/react';
import Screen from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import GiftsTab from '@/components/wishlist/GiftsTab';
import GiftSheet from '@/components/wishlist/GiftSheet';
import GiftDetail from '@/components/wishlist/GiftDetail';
import WatchTab from '@/components/wishlist/WatchTab';
import { WatchAddSheet, WatchDetailSheet } from '@/components/wishlist/WatchSheets';
import DreamsTab from '@/components/wishlist/DreamsTab';
import { WATCH_STATUSES, deleteWatchItem, updateWatchItem, useDreams, useGifts, useWatch } from '@/lib/wishlist';

const SEGMENTS = [
  { id: 'gifts', label: 'Gifts' },
  { id: 'watch', label: 'Watch' },
  { id: 'dreams', label: 'Dreams' },
];

export default function WishlistPage() {
  const [segment, setSegment] = useState('gifts');
  const gifts = useGifts();
  const watch = useWatch();
  const dreams = useDreams();

  // Open records are kept by id so they refresh when the data reloads.
  const [giftId, setGiftId] = useState(null);
  const [giftEdit, setGiftEdit] = useState(null); // { gift } | null
  const [watchId, setWatchId] = useState(null);
  const [watchAdd, setWatchAdd] = useState(false);
  const [watchMenu, setWatchMenu] = useState(null);
  const [watchDelete, setWatchDelete] = useState(null);
  const [dreamAdd, setDreamAdd] = useState(false);

  const openGift = gifts.data?.find((g) => g.id === giftId) ?? null;
  const openWatch = watch.data?.find((w) => w.id === watchId) ?? null;

  function add() {
    if (segment === 'gifts') setGiftEdit({ gift: null });
    if (segment === 'watch') setWatchAdd(true);
    if (segment === 'dreams') setDreamAdd(true);
  }

  return (
    <Screen>
      <AppNavbar title="Wishlist" onAdd={add} />

      <div className="mx-4 mt-2">
        <Segmented strong rounded>
          {SEGMENTS.map((s) => (
            <SegmentedButton key={s.id} strong rounded active={s.id === segment} onClick={() => setSegment(s.id)}>
              {s.label}
            </SegmentedButton>
          ))}
        </Segmented>
      </div>

      {segment === 'gifts' && (
        <GiftsTab gifts={gifts.data ?? []} loading={gifts.loading} onOpen={(g) => setGiftId(g.id)} onAdd={() => setGiftEdit({ gift: null })} />
      )}
      {segment === 'watch' && (
        <WatchTab items={watch.data ?? []} loading={watch.loading} onOpen={(i) => setWatchId(i.id)} onMenu={setWatchMenu} />
      )}
      {segment === 'dreams' && (
        <DreamsTab dreams={dreams.data ?? []} loading={dreams.loading} adding={dreamAdd} onAddClose={() => setDreamAdd(false)} onChanged={dreams.reload} />
      )}

      <GiftSheet
        opened={Boolean(giftEdit)}
        gift={giftEdit?.gift ?? null}
        onClose={(changed) => {
          setGiftEdit(null);
          if (changed) gifts.reload();
        }}
      />
      <GiftDetail
        gift={openGift}
        onEdit={(gift) => {
          setGiftId(null);
          setGiftEdit({ gift });
        }}
        onClose={(changed, keepOpen) => {
          if (!keepOpen) setGiftId(null);
          if (changed) gifts.reload();
        }}
      />

      <WatchAddSheet
        opened={watchAdd}
        onClose={(changed) => {
          setWatchAdd(false);
          if (changed) watch.reload();
        }}
      />
      <WatchDetailSheet
        item={openWatch}
        onClose={(changed, keepOpen) => {
          if (!keepOpen) setWatchId(null);
          if (changed) watch.reload();
        }}
      />

      <Actions opened={Boolean(watchMenu)} onBackdropClick={() => setWatchMenu(null)}>
        <ActionsGroup>
          <ActionsLabel>{watchMenu?.title}</ActionsLabel>
          <ActionsButton
            onClick={async () => {
              await updateWatchItem(watchMenu.id, { pinned: !watchMenu.pinned });
              setWatchMenu(null);
              watch.reload();
            }}
          >
            {watchMenu?.pinned ? 'Unpin' : 'Pin to top'}
          </ActionsButton>
          {WATCH_STATUSES.filter((s) => s.id !== watchMenu?.status).map((s) => (
            <ActionsButton
              key={s.id}
              onClick={async () => {
                await updateWatchItem(watchMenu.id, { status: s.id });
                setWatchMenu(null);
                watch.reload();
              }}
            >
              Mark as “{s.label}”
            </ActionsButton>
          ))}
          <ActionsButton
            className="text-danger!"
            onClick={() => {
              setWatchDelete(watchMenu);
              setWatchMenu(null);
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setWatchMenu(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <Actions opened={Boolean(watchDelete)} onBackdropClick={() => setWatchDelete(null)}>
        <ActionsGroup>
          <ActionsLabel>Delete “{watchDelete?.title}” for both of you?</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              await deleteWatchItem(watchDelete.id);
              setWatchDelete(null);
              watch.reload();
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setWatchDelete(null)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </Screen>
  );
}
