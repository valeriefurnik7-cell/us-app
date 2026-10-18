import { publicUrl, requestUser } from '@/lib/server/auth';

const MAX_BYTES = 600_000;

const decode = (s) =>
  s
    ?.replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

function meta(html, ...names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${name}["']`,
      'i'
    );
    const m = html.match(re);
    if (m) return decode(m[1] || m[2]);
  }
  return null;
}

/** Title, image and price of a shop page, for "add a gift by link". Best effort — shops may block it. */
export async function GET(request) {
  if (!(await requestUser(request))) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const target = publicUrl(new URL(request.url).searchParams.get('url'));
  if (!target) return Response.json({ error: 'bad_url' }, { status: 400 });

  try {
    const res = await fetch(target, {
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        'accept-language': 'en,ru;q=0.8',
      },
    });
    const reader = res.body.getReader();
    let html = '';
    const decoder = new TextDecoder();
    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    const title = meta(html, 'og:title', 'twitter:title') ?? decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
    let image = meta(html, 'og:image', 'og:image:secure_url', 'twitter:image');
    if (image) image = new URL(image, res.url).toString();
    // Meta tags first, then the schema.org product data most shops embed.
    const price = meta(html, 'product:price:amount', 'og:price:amount', 'price') ?? html.match(/"price"\s*:\s*"?(\d+(?:[.,]\d+)?)/)?.[1];
    const currency = meta(html, 'product:price:currency', 'og:price:currency', 'priceCurrency') ?? html.match(/"priceCurrency"\s*:\s*"([A-Z]{3})"/)?.[1];
    return Response.json({ title, image, price: price ? Number(price.replace(',', '.')) || null : null, currency });
  } catch {
    return Response.json({ title: null, image: null, price: null, currency: null });
  }
}
