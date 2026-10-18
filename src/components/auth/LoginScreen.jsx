'use client';

import { useState } from 'react';
import { Block, BlockFooter, Button, List, ListInput, Page } from 'konsta/react';
import { Paw } from 'framework7-icons/react';
import { errorMessage, supabase } from '@/lib/supabase';

// Email + 6-digit code instead of a magic link: on iOS the link opens in Safari,
// which does not share the session with the app installed on the Home Screen.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else setSent(true);
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError(errorMessage(error));
  }

  return (
    <Page className="flex flex-col justify-center pt-safe pb-safe">
      <div className="mb-6 flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-card bg-accent text-white">
          <Paw className="text-[34px]" />
        </span>
        <h1 className="text-large-title font-bold">Us</h1>
        <p className="text-subhead text-text-secondary">{sent ? `We sent a code to ${email}` : 'Sign in with your email'}</p>
      </div>

      <form onSubmit={sent ? verify : sendCode}>
        <List strong inset>
          {sent ? (
            <ListInput
              key="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          ) : (
            <ListInput
              key="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </List>
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}
        <Block className="flex flex-col gap-2">
          <Button large rounded type="submit" disabled={busy || (sent ? code.trim().length < 6 : !email.includes('@'))}>
            {sent ? 'Sign in' : 'Get code'}
          </Button>
          {sent && (
            <Button large rounded clear type="button" onClick={() => { setSent(false); setCode(''); setError(null); }}>
              Use another email
            </Button>
          )}
        </Block>
      </form>
    </Page>
  );
}
