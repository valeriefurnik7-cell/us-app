'use client';

import { useCallback, useEffect, useState } from 'react';
import { isDemo, supabase } from './supabase';

/**
 * Loads data and reloads it whenever any of `tables` changes in the database,
 * including changes made on the other phone (Supabase Realtime).
 * `tables` must be a stable array (define it outside the component).
 */
export function useLive(load, tables) {
  const [state, setState] = useState({ data: null, loading: true });

  const reload = useCallback(async () => {
    const data = await load();
    setState({ data, loading: false });
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const run = async () => {
      const data = await load();
      if (!cancelled) setState({ data, loading: false });
    };
    Promise.resolve().then(run);
    // Demo data lives in this browser only — there is no other phone to listen to.
    if (isDemo) {
      return () => {
        cancelled = true;
      };
    }

    // Several rows usually change together (a post and its photos), so reload once they settle.
    const channel = supabase.channel(`live:${tables.join(',')}:${crypto.randomUUID()}`);
    tables.forEach((table) =>
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(timer);
        timer = setTimeout(run, 400);
      })
    );
    channel.subscribe();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [load, tables]);

  return { ...state, reload };
}
