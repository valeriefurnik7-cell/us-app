import { supabase } from './supabase';

const BUCKET = 'media';
const MAX_SIDE = 2048;
const URL_TTL = 60 * 60 * 24; // seconds

// Phone photos are 3–10 MB; a 2048px JPEG keeps them sharp on screen and uploads fast.
async function compressImage(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob ?? file;
}

export const mediaType = (file) => (file.type.startsWith('video/') ? 'video' : 'photo');

/** Uploads to "<pairId>/<folder>/<uuid>.<ext>" and returns the storage path. */
export async function uploadMedia(file, pairId, folder) {
  const type = mediaType(file);
  const body = type === 'photo' ? await compressImage(file) : file;
  const ext = type === 'photo' ? 'jpg' : (file.name.split('.').pop() || 'mp4').toLowerCase();
  const path = `${pairId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: type === 'photo' ? 'image/jpeg' : file.type, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

export async function removeMedia(paths) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

// The bucket is private, so files are shown through short-lived signed URLs, cached per session.
const urlCache = new Map();

export async function signedUrls(paths) {
  const missing = [...new Set(paths.filter((p) => p && !urlCache.has(p)))];
  if (missing.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, URL_TTL);
    data?.forEach((d) => d.signedUrl && urlCache.set(d.path, d.signedUrl));
  }
  return Object.fromEntries(paths.filter(Boolean).map((p) => [p, urlCache.get(p)]));
}

export const cachedUrl = (path) => urlCache.get(path);
