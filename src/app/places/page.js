import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';

export default function PlacesPage() {
  return (
    <Screen>
      <AppNavbar title="Places" />
      <EmptyState title="No places yet" text="Places to visit when you meet up" />
    </Screen>
  );
}
