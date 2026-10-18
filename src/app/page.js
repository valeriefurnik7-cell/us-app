import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';

export default function HomePage() {
  return (
    <Screen>
      <AppNavbar title="Home" />
      <EmptyState title="“Us” card coming soon" text="Cities, local time, weather and the countdown to your next meetup" />
    </Screen>
  );
}
