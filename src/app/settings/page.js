'use client';

import { BlockTitle, List, ListItem, Radio } from 'konsta/react';
import Screen from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { useTheme } from '@/components/ThemeProvider';

const MODES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export default function SettingsPage() {
  const { mode, setMode } = useTheme();
  return (
    <Screen>
      <InnerNavbar title="Settings" />
      <BlockTitle>Appearance</BlockTitle>
      <List strong inset>
        {MODES.map((m) => (
          <ListItem
            key={m.id}
            label
            title={m.label}
            after={
              <Radio component="div" checked={mode === m.id} onChange={() => setMode(m.id)} />
            }
          />
        ))}
      </List>
    </Screen>
  );
}
