'use client';

// "For you two": keyless recommendations scored by the genres you both like.
// Series come from TVmaze's catalog (with ratings); films from a hand-picked list of acclaimed titles
// whose posters are fetched from Wikipedia.

const FILMS = [
  ['Past Lives', 'Romance', 'Past Lives (film)'],
  ['Everything Everywhere All at Once', 'Sci-fi', 'Everything Everywhere All at Once'],
  ['The Grand Budapest Hotel', 'Comedy', 'The Grand Budapest Hotel'],
  ['Amélie', 'Romance', 'Amélie'],
  ['La La Land', 'Musical', 'La La Land'],
  ['Little Women', 'Drama', 'Little Women (2019 film)'],
  ['Portrait of a Lady on Fire', 'Romance', 'Portrait of a Lady on Fire'],
  ['Parasite', 'Thriller', 'Parasite (2019 film)'],
  ['Arrival', 'Sci-fi', 'Arrival (film)'],
  ['Interstellar', 'Sci-fi', 'Interstellar (film)'],
  ['Spirited Away', 'Animation', 'Spirited Away'],
  ['Howl’s Moving Castle', 'Animation', "Howl's Moving Castle (film)"],
  ['Before Sunrise', 'Romance', 'Before Sunrise'],
  ['Lady Bird', 'Comedy', 'Lady Bird (film)'],
  ['Knives Out', 'Mystery', 'Knives Out'],
  ['Gone Girl', 'Thriller', 'Gone Girl (film)'],
  ['Her', 'Sci-fi', 'Her (film)'],
  ['Call Me by Your Name', 'Romance', 'Call Me by Your Name (film)'],
  ['The Devil Wears Prada', 'Comedy', 'The Devil Wears Prada (film)'],
  ['Barbie', 'Comedy', 'Barbie (film)'],
  ['Oppenheimer', 'Drama', 'Oppenheimer (film)'],
  ['Poor Things', 'Comedy', 'Poor Things (film)'],
  ['Anatomy of a Fall', 'Drama', 'Anatomy of a Fall'],
  ['The Worst Person in the World', 'Romance', 'The Worst Person in the World (film)'],
  ['Mamma Mia!', 'Musical', 'Mamma Mia! (film)'],
  ['Pride & Prejudice', 'Romance', 'Pride & Prejudice (2005 film)'],
  ['Mad Max: Fury Road', 'Action', 'Mad Max: Fury Road'],
  ['Get Out', 'Horror', 'Get Out'],
  ['Coco', 'Animation', 'Coco (2017 film)'],
  ['Inside Out', 'Animation', 'Inside Out (2015 film)'],
];

/** How much we like each genre, from our own list: ratings count most, then watching/finished, then wishes. */
export function tasteProfile(items) {
  const weights = {};
  items.forEach((i) => {
    if (!i.genre) return;
    const ratings = i.progress.map((p) => p.rating).filter(Boolean);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    let w = i.status === 'want' ? 0.5 : 1;
    if (avg !== null) w += avg - 3; // a 5★ counts a lot, a 1★ pushes the genre away
    if (i.pinned) w += 0.5;
    weights[i.genre] = (weights[i.genre] ?? 0) + w;
  });
  return weights;
}

let seriesCache = null;
async function seriesCatalog() {
  if (seriesCache) return seriesCache;
  const pages = await Promise.all([0, 1].map((p) => fetch(`https://api.tvmaze.com/shows?page=${p}`).then((r) => r.json()).catch(() => [])));
  seriesCache = pages
    .flat()
    .filter((s) => (s.rating?.average ?? 0) >= 8 && s.image?.medium && s.language === 'English')
    .map((s) => ({
      key: `t${s.id}`,
      title: s.name,
      type: 'series',
      genre: s.genres?.[0] ?? null,
      genres: s.genres ?? [],
      rating: s.rating.average,
      poster_url: s.image.medium.replace('http://', 'https://'),
      subtitle: ['Series', s.premiered?.slice(0, 4)].filter(Boolean).join(' · '),
    }));
  return seriesCache;
}

let filmCache = null;
async function filmCatalog() {
  if (filmCache) return filmCache;
  const titles = FILMS.map((f) => f[2]).join('|');
  const json = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilicense=any&redirects=1&format=json&origin=*`
  )
    .then((r) => r.json())
    .catch(() => null);
  const posters = {};
  const redirects = Object.fromEntries((json?.query?.redirects ?? []).map((r) => [r.to, r.from]));
  const normalized = Object.fromEntries((json?.query?.normalized ?? []).map((n) => [n.to, n.from]));
  Object.values(json?.query?.pages ?? {}).forEach((p) => {
    const original = normalized[redirects[p.title] ?? p.title] ?? redirects[p.title] ?? p.title;
    if (p.thumbnail?.source) posters[original] = p.thumbnail.source.split('?')[0];
  });
  filmCache = FILMS.map(([title, genre, page], i) => ({
    key: `f${i}`,
    title,
    type: 'movie',
    genre,
    genres: [genre],
    rating: 8.5 - i * 0.02, // the list is roughly in order of acclaim
    poster_url: posters[page] ?? null,
    subtitle: 'Film',
  }));
  return filmCache;
}

/** Top picks for us, with a short "because…" reason. */
export async function recommendations(items, limit = 12) {
  const taste = tasteProfile(items);
  const have = new Set(items.map((i) => i.title.toLowerCase()));
  const loved = Object.entries(taste)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
  const [series, films] = await Promise.all([seriesCatalog(), filmCatalog()]);
  const score = (c) => {
    const affinity = c.genres.reduce((sum, g) => sum + Math.max(0, taste[g] ?? 0), 0);
    return affinity * 1.5 + c.rating;
  };
  const picks = [...series, ...films]
    .filter((c) => !have.has(c.title.toLowerCase()))
    .map((c) => ({ ...c, score: score(c) }))
    .sort((a, b) => b.score - a.score);

  // Keep a mix: never more than 2/3 of one type.
  const result = [];
  const count = { movie: 0, series: 0 };
  for (const p of picks) {
    if (result.length >= limit) break;
    if (count[p.type] >= Math.ceil((limit * 2) / 3)) continue;
    count[p.type] += 1;
    const because = p.genres.find((g) => loved.includes(g));
    result.push({ ...p, reason: because ? `Because you like ${because.toLowerCase()}` : p.type === 'series' ? 'Top rated series' : 'Acclaimed film' });
  }
  return result;
}
