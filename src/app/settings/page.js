'use client';

import { useState } from 'react';
import { BlockFooter, BlockTitle, List, ListButton, ListInput, ListItem, Radio, Actions, ActionsButton, ActionsGroup, ActionsLabel } from 'konsta/react';
import Screen from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { useTheme } from '@/components/ThemeProvider';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabase';

const MODES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function PairName() {
  const { pair, refresh } = useSession();
  const [name, setName] = useState(pair?.name ?? '');

  async function save() {
    const next = name.trim();
    if (!next || next === pair.name) return setName(pair.name);
    await supabase.from('pairs').update({ name: next }).eq('id', pair.id);
    await refresh();
  }

  return (
    <ListInput
      value={name}
      placeholder="Us"
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  const { session, signOut } = useSession();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <Screen>
      <InnerNavbar title="Settings" />

      <BlockTitle>Friendship name</BlockTitle>
      <List strong inset>
        <PairName />
      </List>

      <BlockTitle>Appearance</BlockTitle>
      <List strong inset>
        {MODES.map((m) => (
          <ListItem
            key={m.id}
            label
            title={m.label}
            after={<Radio component="div" checked={mode === m.id} onChange={() => setMode(m.id)} />}
          />
        ))}
      </List>

      <BlockTitle>Account</BlockTitle>
      <List strong inset>
        <ListButton className="text-danger!" onClick={() => setConfirmSignOut(true)}>
          Sign out
        </ListButton>
      </List>
      <BlockFooter>{session?.user.email}</BlockFooter>

      <Actions opened={confirmSignOut} onBackdropClick={() => setConfirmSignOut(false)}>
        <ActionsGroup>
          <ActionsLabel>You will need a new code from your email to sign back in.</ActionsLabel>
          <ActionsButton className="text-danger!" onClick={signOut}>
            Sign out
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirmSignOut(false)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </Screen>
  );
}
