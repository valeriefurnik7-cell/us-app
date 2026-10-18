import { signedUrls } from './media';

/**
 * Image columns hold either an external URL (from a shop or a poster service) or a path in our private bucket.
 * Adds `${key}Src` with something an <img> can show.
 */
export async function withImages(rows, ...keys) {
  const paths = rows.flatMap((r) => keys.map((k) => r[k])).filter((v) => v && !v.startsWith('http'));
  const urls = await signedUrls(paths);
  return rows.map((r) => {
    const out = { ...r };
    keys.forEach((k) => {
      const v = r[k];
      out[`${k}Src`] = !v ? null : v.startsWith('http') ? v : urls[v] ?? null;
    });
    return out;
  });
}
