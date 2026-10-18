import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';

export default function CatsPage() {
  return (
    <Screen>
      <AppNavbar title="Cats" />
      <EmptyState title="No cats yet" text="Cat profiles and the cat feed will live here" />
    </Screen>
  );
}
