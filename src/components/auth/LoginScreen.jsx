'use client';

import { useState } from 'react';
import { Block, BlockFooter, Button, List, ListInput, Page } from 'konsta/react';
import { Paw } from 'framework7-icons/react';
import { errorMessage, supabase } from '@/lib/supabase';
import { enableDemo } from '@/lib/demo/mode';

// Email + password: no email delivery needed, and the session lives right in the Home Screen app.
export default function LoginScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isSignUp = mode === 'signup';

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const credentials = { email: email.trim(), password };
    const { data, error } = isSignUp
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials);
    setBusy(false);
    if (error) setError(errorMessage(error));
    else if (isSignUp && !data.session) setError('Turn off “Confirm email” in Supabase, then sign in.');
  }

  return (
    <Page className="flex flex-col justify-center pt-safe pb-safe">
      <div className="mb-6 flex flex-col items-center gap-3">
        <span className="flex h-16 w-16 items-center justify-center rounded-card bg-accent text-white">
          <Paw className="text-[34px]" />
        </span>
        <h1 className="text-large-title font-bold">Us</h1>
        <p className="text-subhead text-text-secondary">{isSignUp ? 'Create your account' : 'Sign in to continue'}</p>
      </div>

      <form onSubmit={submit}>
        <List strong inset>
          <ListInput
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <ListInput
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            placeholder={isSignUp ? 'Password, at least 6 characters' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </List>
        {error && <BlockFooter className="text-danger!">{error}</BlockFooter>}
        <Block className="flex flex-col gap-2">
          <Button large rounded type="submit" disabled={busy || !email.includes('@') || password.length < 6}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </Button>
          <Button
            large
            rounded
            clear
            type="button"
            onClick={() => {
              setMode(isSignUp ? 'signin' : 'signup');
              setError(null);
            }}
          >
            {isSignUp ? 'I already have an account' : 'Create an account'}
          </Button>
          <button type="button" onClick={enableDemo} className="mt-4 h-11 text-subhead text-text-secondary">
            Look around with demo data
          </button>
        </Block>
      </form>
    </Page>
  );
}
