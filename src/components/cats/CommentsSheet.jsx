'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link, Sheet, Toolbar } from 'konsta/react';
import { ArrowUpCircleFill } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { supabase } from '@/lib/supabase';
import { timeAgo } from '@/lib/dates';

function Comments({ postId, onClose }) {
  const { me, partner } = useSession();
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('comments').select('*').eq('post_id', postId).order('created_at');
    setComments(data ?? []);
  }, [postId]);

  useEffect(() => {
    Promise.resolve().then(load);
    const channel = supabase
      .channel(`comments:${postId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [postId, load]);

  async function send(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    await supabase.from('comments').insert({ post_id: postId, author_id: me.id, text: value });
    await load();
  }

  const author = (id) => (id === me.id ? me : partner);

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <span className="ps-2 text-body font-semibold">Comments</span>
        <Link toolbar onClick={onClose}>
          Done
        </Link>
      </Toolbar>
      <div className="max-h-[55vh] min-h-32 overflow-auto px-4 py-2">
        {comments === null ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-control bg-surface-2" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-subhead text-text-secondary">No comments yet</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar who={c.author_id === me.id ? 'me' : 'her'} name={author(c.author_id)?.name} />
                <div className="min-w-0 rounded-control bg-surface-2 px-3 py-2">
                  <p className="text-body break-words">{c.text}</p>
                  <p className="mt-0.5 text-caption text-text-secondary">{timeAgo(c.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 px-4 pt-2 pb-safe-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment"
          className="h-11 min-w-0 flex-1 rounded-full bg-surface-2 px-4 text-body outline-none"
        />
        <button type="submit" aria-label="Send" disabled={!text.trim()} className="flex h-11 w-11 items-center justify-center text-primary disabled:opacity-40">
          <ArrowUpCircleFill className="text-[32px]" />
        </button>
      </form>
    </>
  );
}

export default function CommentsSheet({ postId, onClose }) {
  return (
    <Sheet opened={Boolean(postId)} onBackdropClick={onClose} className="w-full">
      {postId && <Comments postId={postId} onClose={onClose} />}
    </Sheet>
  );
}
