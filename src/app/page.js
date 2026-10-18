import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import InviteCard from '@/components/InviteCard';

export default function HomePage() {
  return (
    <Screen>
      <AppNavbar title="Home" />
      <InviteCard />
      <EmptyState title="“Us” card coming soon" text="Cities, local time, weather and the countdown to your next meetup" />
    </Screen>
  );
}
