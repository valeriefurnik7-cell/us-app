'use client';

import { useState } from 'react';
import { Block, BlockFooter, BlockTitle, Button, List, ListInput, Page, Segmented, SegmentedButton } from 'konsta/react';
import { errorMessage, supabase } from '@/lib/supabase';
import { useSession } from '../SessionProvider';
import { readPendingInvite, clearPendingInvite } from '@/lib/invite';

export default function OnboardingScreen() {
  const { refresh, signOut, session } = useSession();
  const pending = readPendingInvite();
  const [mode, setMode] = useState(pending ? 'join' : 'create');
  const [name, setName] = useState('');
  const [pairName, setPairName] = useState('Us');
  const [code, setCode] = useState(pending ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } =
      mode === 'create'
        ? await supabase.rpc('create_pair', { pair_name: pairName, my_name: name })
        : await supabase.rpc('join_pair', { code: code.trim(), my_name: name });
    setBusy(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    clearPendingInvite();
    await refresh();
  }

  return (
    <Page className="pt-safe pb-safe">
      <div className="px-4 pt-16 pb-2">
        <h1 className="text-large-title font-bold">Welcome</h1>
        <p className="mt-1 text-subhead text-text-secondary">{session?.user.email}</p>
      </div>

      <div className="mx-4 mt-4">
        <Segmented strong rounded>
          <SegmentedButton strong rounded active={mode === 'create'} onClick={() => setMode('create')}>
            Start a pair
          </SegmentedButton>
          <SegmentedButton strong rounded active={mode === 'join'} onClick={() => setMode('join')}>
            I have an invite
          </SegmentedButton>
        </Segmented>
      </div>

      <form onSubmit={submit}>
        <BlockTitle>About you</BlockTitle>
        <List strong inset>
          <ListInput label="Your name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          {mode === 'create' ? (
            <ListInput label="Friendship name" placeholder="Us" value={pairName} onChange={(e) => setPairName(e.target.value)} />
          ) : (
            <ListInput label="Invite code" placeholder="From your friend's link" value={code} onChange={(e) => setCode(e.target.value)} />
          )}
        </List>
        {mode === 'create' && (
          <BlockFooter>You will get a link to invite one friend. After she joins, the pair is closed.</BlockFooter>
        )}
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}
        <Block className="flex flex-col gap-2">
          <Button large rounded type="submit" disabled={busy || !name.trim() || (mode === 'join' && !code.trim())}>
            {mode === 'create' ? 'Create our space' : 'Join'}
          </Button>
          <Button large rounded clear type="button" onClick={signOut}>
            Sign out
          </Button>
        </Block>
      </form>
    </Page>
  );
}
