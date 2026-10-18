'use client';

import Screen from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import UpdatesFeed from '@/components/UpdatesFeed';
import { useUpdates } from '@/lib/home';

export default function UpdatesPage() {
  const updates = useUpdates(100);
  return (
    <Screen>
      <InnerNavbar title="Updates" />
      <UpdatesFeed items={updates.data ?? []} loading={updates.loading} grouped empty="Nothing here yet — add a pet photo, a wish or a plan" />
    </Screen>
  );
}
