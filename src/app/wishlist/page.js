'use client';

import { useState } from 'react';
import { Segmented, SegmentedButton } from 'konsta/react';
import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';

const SEGMENTS = [
  { id: 'gifts', label: 'Gifts', empty: 'No gifts yet' },
  { id: 'watch', label: 'Watch', empty: 'Nothing to watch yet' },
  { id: 'dreams', label: 'Dreams', empty: 'No dreams yet' },
];

export default function WishlistPage() {
  const [active, setActive] = useState(SEGMENTS[0].id);
  const segment = SEGMENTS.find((s) => s.id === active);
  return (
    <Screen>
      <AppNavbar title="Wishlist" />
      <div className="mx-4 mt-2">
        <Segmented strong rounded>
          {SEGMENTS.map((s) => (
            <SegmentedButton key={s.id} strong rounded active={s.id === active} onClick={() => setActive(s.id)}>
              {s.label}
            </SegmentedButton>
          ))}
        </Segmented>
      </div>
      <EmptyState title={segment.empty} />
    </Screen>
  );
}
