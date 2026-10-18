'use client';

import { supabase } from './supabase';
import { mediaType, removeMedia, signedUrls, uploadMedia } from './media';
import { useLive } from './useLive';
import { dayKey, streak } from './dates';

export const REACTIONS = ['❤️', '😂', '🥹'];

const CAT_TABLES = ['cats'];
const FEED_TABLES = ['cat_posts', 'cat_post_media', 'reactions', 'comments'];

async function loadCats() {
  const { data } = await supabase.from('cats').select('*').order('created_at');
  const cats = data ?? [];
  const urls = await signedUrls(cats.map((c) => c.cover_url));
  return cats.map((c) => ({ ...c, cover: urls[c.cover_url] ?? null }));
}

async function loadFeed() {
  const { data } = await supabase
    .from('cat_posts')
    .select(
      'id, author_id, caption, created_at, cat_post_media(id, url, type, order), cat_post_cats(cat_id), reactions(id, author_id, emoji), comments(count)'
    )
    .order('created_at', { ascending: false })
    .limit(200);
  const posts = data ?? [];
  const urls = await signedUrls(posts.flatMap((p) => p.cat_post_media.map((m) => m.url)));
  return posts.map((p) => ({
    id: p.id,
    authorId: p.author_id,
    caption: p.caption,
    createdAt: p.created_at,
    media: [...p.cat_post_media].sort((a, b) => a.order - b.order).map((m) => ({ ...m, src: urls[m.url] })),
    catIds: p.cat_post_cats.map((c) => c.cat_id),
    reactions: p.reactions,
    commentCount: p.comments[0]?.count ?? 0,
  }));
}

export const useCats = () => useLive(loadCats, CAT_TABLES);
export const useFeed = () => useLive(loadFeed, FEED_TABLES);

/** Days in a row when both of you posted a cat. */
export function pairStreak(posts, me, partner) {
  if (!me || !partner) return 0;
  const byDay = new Map();
  posts.forEach((p) => {
    const key = dayKey(p.createdAt);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key).add(p.authorId);
  });
  const both = new Set([...byDay].filter(([, authors]) => authors.has(me.id) && authors.has(partner.id)).map(([k]) => k));
  return streak(both);
}

/** Days in a row with at least one photo of this cat. */
export const catStreak = (posts) => streak(new Set(posts.map((p) => dayKey(p.createdAt))));

export async function createPost({ files, catIds, caption, me, pair, onProgress }) {
  const { data: post, error } = await supabase
    .from('cat_posts')
    .insert({ pair_id: pair.id, author_id: me.id, caption: caption.trim() || null })
    .select()
    .single();
  if (error) throw error;

  const rows = [];
  try {
    for (const [i, file] of files.entries()) {
      const url = await uploadMedia(file, pair.id, `posts/${post.id}`);
      rows.push({ post_id: post.id, url, type: mediaType(file), order: i });
      onProgress?.((i + 1) / files.length);
    }
    const { error: mediaError } = await supabase.from('cat_post_media').insert(rows);
    if (mediaError) throw mediaError;
  } catch (e) {
    // Don't leave an empty post behind
    await removeMedia(rows.map((r) => r.url));
    await supabase.from('cat_posts').delete().eq('id', post.id);
    throw e;
  }
  if (catIds.length) await supabase.from('cat_post_cats').insert(catIds.map((cat_id) => ({ post_id: post.id, cat_id })));
  await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'cat_photo', target_id: post.id });
  return post;
}

export async function deletePost(post) {
  await removeMedia(post.media.map((m) => m.url));
  await supabase.from('cat_posts').delete().eq('id', post.id);
}

export async function toggleReaction(post, emoji, me) {
  const mine = post.reactions.find((r) => r.author_id === me.id && r.emoji === emoji);
  if (mine) await supabase.from('reactions').delete().eq('id', mine.id);
  else await supabase.from('reactions').insert({ post_id: post.id, author_id: me.id, emoji });
}

/** Double tap: adds a heart, never removes it. */
export async function addHeart(post, me) {
  if (post.reactions.some((r) => r.author_id === me.id && r.emoji === REACTIONS[0])) return;
  await supabase.from('reactions').insert({ post_id: post.id, author_id: me.id, emoji: REACTIONS[0] });
}
