'use client';

import { useCallback, useState } from 'react';
import { Link, Sheet, Toolbar } from 'konsta/react';
import { BubbleLeft } from 'framework7-icons/react';
import Avatar from './Avatar';
import { useSession } from './SessionProvider';
import { supabase } from '@/lib/supabase';
import { useLive } from '@/lib/useLive';
import { notify } from '@/lib/push';
import { timeAgo } from '@/lib/dates';

const TABLES = ['change_requests'];

/**
 * Something only its owner may edit (her solo trip, her plan, her dream):
 * the other one can "Suggest a change"; the owner sees the suggestions and marks them done.
 */
export default function ChangeRequests({ kind, targetId, ownerId }) {
  const { me, partner, pair } = useSession();
  const isOwner = ownerId === me.id;
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('change_requests').select('*').eq('target_id', targetId).order('created_at', { ascending: false });
    return data ?? [];
  }, [targetId]);
  const { data, reload } = useLive(load, TABLES);
  const open = (data ?? []).filter((r) => r.status === 'open');

  async function send() {
    const value = text.trim();
    if (!value) return;
    await supabase.from('change_requests').insert({ pair_id: pair.id, author_id: me.id, target_kind: kind, target_id: targetId, text: value });
    notify('request');
    setText('');
    setWriting(false);
    reload();
  }

  async function resolve(request, status) {
    await supabase.from('change_requests').update({ status }).eq('id', request.id);
    reload();
  }

  if (isOwner && !open.length) return null;

  return (
    <section className="mx-4 mt-6">
      {open.length > 0 && (
        <>
          <h3 className="mb-1.5 px-4 text-caption font-semibold tracking-wide text-text-secondary uppercase">
            {isOwner ? `${partner?.name ?? 'She'} suggests` : 'Your suggestions'}
          </h3>
          <ul className="overflow-hidden rounded-card bg-surface">
            {open.map((r) => (
              <li key={r.id} className="flex gap-3 border-b border-text-secondary/15 px-4 py-3 last:border-0">
                <Avatar who={r.author_id === me.id ? 'me' : 'her'} name={(r.author_id === me.id ? me : partner)?.name} src={(r.author_id === me.id ? me : partner)?.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="text-body break-words">{r.text}</p>
                  <p className="text-caption text-text-secondary">{timeAgo(r.created_at)}</p>
                  {isOwner && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => resolve(r, 'done')} className="h-9 rounded-full bg-accent px-4 text-subhead font-semibold text-white">
                        Done
                      </button>
                      <button type="button" onClick={() => resolve(r, 'dismissed')} className="h-9 rounded-full bg-surface-2 px-4 text-subhead">
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {!isOwner && (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface text-body font-semibold text-primary"
        >
          <BubbleLeft className="text-[18px]" />
          Suggest a change
        </button>
      )}
      {!isOwner && (
        <p className="mt-1.5 px-4 text-center text-caption text-text-secondary">Only {partner?.name ?? 'she'} can change this — she’ll see your note.</p>
      )}

      <Sheet opened={writing} onBackdropClick={() => setWriting(false)} className="w-full">
        <Toolbar top innerClassName="w-full! items-center! justify-between">
          <Link toolbar onClick={() => setWriting(false)}>
            Cancel
          </Link>
          <span className="text-body font-semibold">Suggest a change</span>
          <Link toolbar onClick={send} className={text.trim() ? '' : 'pointer-events-none opacity-40'}>
            <b>Send</b>
          </Link>
        </Toolbar>
        <div className="px-4 pt-2 pb-safe-8">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Can we move it a day later? / Add the Colosseum"
            className="w-full resize-none rounded-card bg-surface px-4 py-3 text-body outline-none"
          />
        </div>
      </Sheet>
    </section>
  );
}
