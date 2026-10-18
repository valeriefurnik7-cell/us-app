import { notFound } from 'next/navigation';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';

const PROFILES = {
  me: { who: 'me', name: 'Me', title: 'My profile' },
  friend: { who: 'her', name: 'Friend', title: 'Friend' },
};

export default async function ProfilePage({ params }) {
  const { who } = await params;
  const profile = PROFILES[who];
  if (!profile) notFound();
  return (
    <Screen>
      <InnerNavbar title={profile.title} />
      <div className="mt-2 flex justify-center">
        <Avatar who={profile.who} name={profile.name} size="lg" />
      </div>
      <EmptyState title="Profile arrives in stage 2" text="City, birthday and delivery address" />
    </Screen>
  );
}
