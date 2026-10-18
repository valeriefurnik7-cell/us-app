import { publicUrl, requestUser } from '@/lib/server/auth';

const MAX_REDIRECTS = 5;

/** Name and coordinates out of a Google Maps URL (any of its many shapes). */
function parseMapsUrl(raw) {
  const url = decodeURIComponent(raw);
  const name = url.match(/\/place\/([^/@]+)/)?.[1]?.replace(/\+/g, ' ') ?? new URL(raw).searchParams.get('q');
  const coords =
    url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? // exact pin of the place
    url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? // map center
    url.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  return {
    title: name && !/^-?\d+\.\d+,/.test(name) ? name : null,
    lat: coords ? Number(coords[1]) : null,
    lon: coords ? Number(coords[2]) : null,
  };
}

/** Follows short links like maps.app.goo.gl to the full Google Maps URL, then parses it. */
export async function GET(request) {
  if (!(await requestUser(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  let target = publicUrl(new URL(request.url).searchParams.get('url'));
  if (!target) return Response.json({ error: 'bad_url' }, { status: 400 });

  try {
    for (let i = 0; i < MAX_REDIRECTS; i += 1) {
      const res = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      const next = res.headers.get('location');
      if (!next || res.status < 300 || res.status >= 400) break;
      target = publicUrl(new URL(next, target).toString());
      if (!target) break;
    }
    return Response.json({ url: target?.toString() ?? null, ...parseMapsUrl(target.toString()) });
  } catch {
    return Response.json({ title: null, lat: null, lon: null });
  }
}
