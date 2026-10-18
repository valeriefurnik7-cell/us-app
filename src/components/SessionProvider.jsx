'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

/**
 * status: 'loading' | 'signed-out' | 'no-pair' | 'ready'
 * me / partner: rows from profiles; partner is null until the friend joins.
 */
export function SessionProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [data, setData] = useState(undefined);
  const userId = session?.user.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data: profiles } = await supabase.from('profiles').select('*');
    const me = profiles?.find((p) => p.id === userId) ?? null;
    if (!me) {
      setData({ me: null, partner: null, pair: null });
      return;
    }
    const { data: pair } = await supabase.from('pairs').select('*').single();
    setData({ me, partner: profiles.find((p) => p.id !== userId) ?? null, pair });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) await refresh();
    })();
    // Pick up changes from the other phone (e.g. the friend just joined) when the app comes back.
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, refresh]);

  let status = 'loading';
  if (session === null) status = 'signed-out';
  else if (session && data) status = data.me ? 'ready' : 'no-pair';

  const value = {
    status,
    session,
    me: data?.me ?? null,
    partner: data?.partner ?? null,
    pair: data?.pair ?? null,
    refresh,
    signOut: async () => {
      await supabase.auth.signOut();
      setData(undefined);
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
