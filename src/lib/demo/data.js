// Demo content for "Look around with demo data". Lives only in this browser (see demo/fetch.js).
// Dates are relative to today so the countdown, chat and calendar always look current.

export const DEMO_ME = '0d000000-0000-4000-8000-00000000000a';
export const DEMO_HER = '0d000000-0000-4000-8000-00000000000b';
const PAIR = '0d000000-0000-4000-8000-0000000000ff';

const wiki = (path, file) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/960px-${file}`;

const IMG = {
  bobby: wiki('f/fe/Cocker_spaniel_angielski_zlotyy.jpg', 'Cocker_spaniel_angielski_zlotyy.jpg'),
  bobbyBeach: wiki('1/1a/English_Cocker_Spaniel_at_Batumi_beach%2C_Georgia.jpg', 'English_Cocker_Spaniel_at_Batumi_beach%2C_Georgia.jpg'),
  bobbyPuppy: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Cocker_Spaniel_Puppy.jpg',
  max: wiki('e/ed/Sitzende_graue_Mieze_20201026_DSC5103.jpg', 'Sitzende_graue_Mieze_20201026_DSC5103.jpg'),
  maxShow: wiki('1/14/20170604_kot_na_wystawie_w_Krakowie_7971.jpg', '20170604_kot_na_wystawie_w_Krakowie_7971.jpg'),
  luna: wiki('1/12/Tabby-cat-sleeping.jpg', 'Tabby-cat-sleeping.jpg'),
  lunaBack: wiki('5/5e/Sleeping_cat_on_her_back.jpg', 'Sleeping_cat_on_her_back.jpg'),
  lunaSun: wiki('8/81/Sunlit_Domestic_Cat_Under_Window_Grid_Shadow.jpg', 'Sunlit_Domestic_Cat_Under_Window_Grid_Shadow.jpg'),
  szimpla: wiki('0/07/Szimpla_Kert_Budapest_1.jpg', 'Szimpla_Kert_Budapest_1.jpg'),
  central: wiki('e/e6/Wien%2C_Caf%C3%A9_Central_--_2018_--_3092.jpg', 'Wien%2C_Caf%C3%A9_Central_--_2018_--_3092.jpg'),
  nata: wiki('9/9c/Pastel_de_nata_septembre_2015.jpg', 'Pastel_de_nata_septembre_2015.jpg'),
  duomo: wiki('b/b0/View_west_along_Duomo_roof%2C_Milan.jpg', 'View_west_along_Duomo_roof%2C_Milan.jpg'),
  dune: 'https://upload.wikimedia.org/wikipedia/en/8/8e/Dune_%282021_film%29.jpg',
  dune2: 'https://upload.wikimedia.org/wikipedia/en/5/52/Dune_Part_Two_poster.jpeg',
  severance: 'https://static.tvmaze.com/uploads/images/medium_portrait/548/1371406.jpg',
  bear: 'https://static.tvmaze.com/uploads/images/medium_portrait/629/1574642.jpg',
  fleabag: 'https://static.tvmaze.com/uploads/images/medium_portrait/192/482341.jpg',
};

export function buildDemoDb() {
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 3600e3).toISOString();
  const dayAt = (days, hour = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour).toISOString();
  const ymd = (days) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const birthday = (daysFromNow, years) => {
    const d = new Date(now.getFullYear() - years, now.getMonth(), now.getDate() + daysFromNow);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  let n = 0;
  const id = (prefix) => `0d000000-0000-4000-8000-${prefix}${String((n += 1)).padStart(12 - prefix.length, '0')}`;

  const pets = {
    bobby: id('a'),
    max: id('a'),
    luna: id('a'),
  };

  // ── Chat: oldest first in the app, stored newest first like the database returns them
  const posts = [];
  const media = [];
  const tags = [];
  const reactions = [];
  const message = (author, hours, caption, photos = [], petIds = [], reacts = []) => {
    const postId = id('b');
    posts.push({ id: postId, pair_id: PAIR, author_id: author, caption, created_at: hoursAgo(hours) });
    photos.forEach((url, i) => media.push({ id: id('c'), post_id: postId, url, type: 'photo', order: i }));
    petIds.forEach((cat_id) => tags.push({ post_id: postId, cat_id }));
    reacts.forEach(([who, emoji]) => reactions.push({ id: id('d'), post_id: postId, author_id: who, emoji, created_at: hoursAgo(hours - 0.2) }));
  };
  message(DEMO_HER, 50, 'Luna has claimed the new blanket', [IMG.lunaBack], [pets.luna], [[DEMO_ME, '🥹']]);
  message(DEMO_ME, 49.5, 'Bobby at the lake this morning', [IMG.bobbyBeach], [pets.bobby], [[DEMO_HER, '❤️']]);
  message(DEMO_HER, 49, 'he looks SO happy');
  message(DEMO_ME, 26, 'Max judging me for working late', [IMG.max], [pets.max], [[DEMO_HER, '😂']]);
  message(DEMO_HER, 25.5, 'the face 😂');
  message(DEMO_HER, 24, null, [IMG.luna, IMG.lunaSun], [pets.luna], [[DEMO_ME, '❤️']]);
  message(DEMO_ME, 3, 'Found Bobby’s puppy photo while cleaning the phone', [IMG.bobbyPuppy], [pets.bobby], [[DEMO_HER, '🥹'], [DEMO_HER, '❤️']]);
  message(DEMO_HER, 2.5, 'STOP he was so tiny');
  message(DEMO_HER, 1.2, 'Luna found the sunny spot again', [IMG.lunaSun], [pets.luna]);
  message(DEMO_ME, 0.4, 'Bobby stole my sock. Again.', [], [pets.bobby], [[DEMO_HER, '😂']]);
  posts.reverse();

  const meeting = id('e');
  const trip = id('f');
  const pastTrip = id('f');
  const places = {
    szimpla: id('9'),
    bastion: id('9'),
    central: id('9'),
    nata: id('9'),
    thermal: id('9'),
    lx: id('9'),
  };
  const gifts = { scarf: id('7'), kallax: id('7'), film: id('7'), airpods: id('7'), book: id('7'), candle: id('7'), plant: id('7'), ring: id('7') };
  const watch = { severance: id('8'), dune2: id('8'), bear: id('8'), fleabag: id('8'), dune: id('8') };

  return {
    pairs: [{ id: PAIR, name: 'Us', theme: null, invite_code: null, created_by: DEMO_ME, created_at: hoursAgo(24 * 220) }],
    profiles: [
      { id: DEMO_ME, pair_id: PAIR, name: 'Valeriia', avatar_url: null, city: 'Vienna', lat: 48.2085, lon: 16.3721, timezone: 'Europe/Vienna', birthday: birthday(64, 27), notify_prefs: {}, currency: 'EUR', created_at: hoursAgo(5000) },
      { id: DEMO_HER, pair_id: PAIR, name: 'Masha', avatar_url: null, city: 'Lisbon', lat: 38.7167, lon: -9.1333, timezone: 'Europe/Lisbon', birthday: birthday(7, 27), notify_prefs: {}, currency: 'EUR', created_at: hoursAgo(4990) },
    ],
    addresses: [
      { profile_id: DEMO_ME, country: 'Austria', city: 'Vienna', street: 'Neubaugasse 12', apartment: '14', zip: '1070', recipient: 'Valeriia', phone: '+43 660 000 0000' },
      { profile_id: DEMO_HER, country: 'Portugal', city: 'Lisbon', street: 'Rua da Rosa 85', apartment: '3º Esq', zip: '1200-385', recipient: 'Maria Ivanova', phone: '+351 910 000 000' },
    ],
    cats: [
      { id: pets.bobby, pair_id: PAIR, owner_id: DEMO_ME, name: 'Bobby', species: 'dog', breed: 'English Cocker Spaniel', birthday: birthday(-120, 3), character: 'Sock thief, sunshine', favorites: { food: 'Chicken & apples', toys: 'Squeaky duck', sleep: 'On my feet' }, cover_url: IMG.bobby, created_at: hoursAgo(4000) },
      { id: pets.max, pair_id: PAIR, owner_id: DEMO_ME, name: 'Max', species: 'cat', breed: 'British Shorthair', birthday: birthday(-200, 5), character: 'Grumpy, cuddly', favorites: { food: 'Salmon pâté', toys: 'Laser dot', sleep: 'The laptop' }, cover_url: IMG.maxShow, created_at: hoursAgo(3990) },
      { id: pets.luna, pair_id: PAIR, owner_id: DEMO_HER, name: 'Luna', species: 'cat', breed: 'Tabby', birthday: birthday(-30, 2), character: 'Sun chaser', favorites: { food: 'Tuna', toys: 'Hair ties', sleep: 'Any sunny spot' }, cover_url: IMG.luna, created_at: hoursAgo(3980) },
    ],
    cat_posts: posts,
    cat_post_media: media,
    cat_post_cats: tags,
    reactions,
    comments: [],

    events: [
      { id: meeting, pair_id: PAIR, author_id: DEMO_ME, title: 'Weekend in Budapest', type: 'meeting', start: dayAt(12), end: dayAt(14), all_day: true, city: 'Budapest', note: 'Thermal baths + ruin bars', is_private: false, created_at: hoursAgo(300) },
      { id: id('e'), pair_id: PAIR, author_id: DEMO_HER, title: 'Doctor', type: 'busy', start: dayAt(0, 10), end: dayAt(0, 12), all_day: false, city: 'Lisbon', note: null, is_private: true, created_at: hoursAgo(30) },
      { id: id('e'), pair_id: PAIR, author_id: DEMO_ME, title: 'Design review', type: 'busy', start: dayAt(2, 14), end: dayAt(2, 16), all_day: false, city: 'Vienna', note: null, is_private: false, created_at: hoursAgo(40) },
      { id: id('e'), pair_id: PAIR, author_id: DEMO_HER, title: 'Portuguese exam', type: 'important', start: dayAt(5, 9), end: null, all_day: false, city: 'Lisbon', note: 'Wish me luck', is_private: false, created_at: hoursAgo(60) },
      { id: id('e'), pair_id: PAIR, author_id: DEMO_ME, title: 'Dentist', type: 'important', start: dayAt(4, 8), end: null, all_day: false, city: 'Vienna', note: null, is_private: true, created_at: hoursAgo(80) },
      { id: id('e'), pair_id: PAIR, author_id: DEMO_HER, title: 'Lisbon with Valeriia', type: 'meeting', start: dayAt(-60), end: dayAt(-56), all_day: true, city: 'Lisbon', note: null, is_private: false, created_at: hoursAgo(2000) },
    ],
    trips: [
      { id: trip, pair_id: PAIR, author_id: DEMO_ME, destination: 'Milan', cover_url: IMG.duomo, status: 'planned', start: ymd(30), end: ymd(33), shared: true, created_at: hoursAgo(200) },
      { id: pastTrip, pair_id: PAIR, author_id: DEMO_HER, destination: 'Lisbon', cover_url: IMG.nata, status: 'done', start: ymd(-60), end: ymd(-56), shared: true, created_at: hoursAgo(2100) },
    ],
    trip_stops: [
      { id: id('1'), trip_id: trip, title: 'Duomo rooftop', visited: false, created_at: hoursAgo(190) },
      { id: id('1'), trip_id: trip, title: 'Navigli at sunset', visited: false, created_at: hoursAgo(189) },
      { id: id('1'), trip_id: trip, title: 'Pinacoteca di Brera', visited: false, created_at: hoursAgo(188) },
      { id: id('1'), trip_id: pastTrip, title: 'Pastéis de Belém', visited: true, created_at: hoursAgo(2000) },
      { id: id('1'), trip_id: pastTrip, title: 'Tram 28', visited: true, created_at: hoursAgo(2000) },
    ],
    trip_budgets: [{ trip_id: trip, profile_id: DEMO_ME, amount: 900, currency: 'EUR', visible_to_partner: false }],
    trip_expenses: [
      { id: id('2'), trip_id: trip, profile_id: DEMO_ME, category: 'transport', amount: 138, note: 'Train Vienna → Milan', created_at: hoursAgo(150) },
      { id: id('2'), trip_id: trip, profile_id: DEMO_ME, category: 'stay', amount: 290, note: 'Apartment in Brera', created_at: hoursAgo(149) },
    ],
    trip_packing: [
      { id: id('3'), trip_id: trip, profile_id: DEMO_ME, item: 'Passport', done: true },
      { id: id('3'), trip_id: trip, profile_id: DEMO_ME, item: 'Film camera', done: false },
      { id: id('3'), trip_id: trip, profile_id: DEMO_ME, item: 'Comfy sneakers', done: false },
      { id: id('3'), trip_id: trip, profile_id: DEMO_HER, item: 'Sunglasses', done: true },
    ],
    quick_trips: [
      { id: id('4'), pair_id: PAIR, profile_id: DEMO_HER, city: 'Porto', start: ymd(-25), end: ymd(-23) },
      { id: id('4'), pair_id: PAIR, profile_id: DEMO_ME, city: 'Prague', start: ymd(-40), end: ymd(-38) },
    ],

    gifts: [
      { id: gifts.kallax, pair_id: PAIR, wisher_id: DEMO_ME, list: 'Home', is_secret: false, title: 'KALLAX shelf, white', url: 'https://www.ikea.com/', image_url: 'https://www.ikea.com/gb/en/images/products/kallax-shelving-unit-white__0644757_pe702939_s5.jpg', price: 79, currency: 'EUR', note: '77×147, for the hallway', created_at: hoursAgo(100) },
      { id: gifts.film, pair_id: PAIR, wisher_id: DEMO_ME, list: 'Birthday', is_secret: false, title: 'Kodak Portra 400, 3-pack', url: null, image_url: null, price: 42, currency: 'EUR', note: '35mm', created_at: hoursAgo(120) },
      { id: gifts.candle, pair_id: PAIR, wisher_id: DEMO_ME, list: 'Home', is_secret: false, title: 'Fig candle', url: null, image_url: null, price: 28, currency: 'EUR', note: null, created_at: hoursAgo(140) },
      { id: gifts.ring, pair_id: PAIR, wisher_id: DEMO_ME, list: null, is_secret: true, title: 'Silver ring with a moonstone', url: null, image_url: null, price: 120, currency: 'EUR', note: 'Just a reminder for myself', created_at: hoursAgo(60) },
      { id: gifts.scarf, pair_id: PAIR, wisher_id: DEMO_HER, list: null, is_secret: false, title: 'Linen scarf', url: null, image_url: null, price: 35, currency: 'EUR', note: 'Sage green', created_at: hoursAgo(7) },
      { id: gifts.airpods, pair_id: PAIR, wisher_id: DEMO_HER, list: 'Birthday', is_secret: false, title: 'AirPods Pro', url: 'https://www.apple.com/airpods-pro/', image_url: null, price: 249, currency: 'EUR', note: null, created_at: hoursAgo(300) },
      { id: gifts.book, pair_id: PAIR, wisher_id: DEMO_HER, list: 'Birthday', is_secret: false, title: 'Tomorrow, and Tomorrow, and Tomorrow', url: null, image_url: null, price: 18, currency: 'EUR', note: 'Paperback', created_at: hoursAgo(400) },
      { id: gifts.plant, pair_id: PAIR, wisher_id: DEMO_HER, list: null, is_secret: false, title: 'Monstera in a terracotta pot', url: null, image_url: null, price: 45, currency: 'EUR', note: null, created_at: hoursAgo(900) },
    ],
    gift_reservations: [
      { gift_id: gifts.airpods, giver_id: DEMO_ME, status: 'ordered', tracking: 'PT123456789', given_at: null, created_at: hoursAgo(50) },
      { gift_id: gifts.plant, giver_id: DEMO_ME, status: 'given', tracking: null, given_at: hoursAgo(24 * 58), created_at: hoursAgo(1500) },
    ],
    watch_items: [
      { id: watch.severance, pair_id: PAIR, added_by: DEMO_HER, title: 'Severance', type: 'series', genre: 'Drama', poster_url: IMG.severance, pinned: true, status: 'watching', created_at: hoursAgo(1) },
      { id: watch.dune2, pair_id: PAIR, added_by: DEMO_ME, title: 'Dune: Part Two', type: 'movie', genre: 'Sci-fi', poster_url: IMG.dune2, pinned: false, status: 'want', created_at: hoursAgo(30) },
      { id: watch.bear, pair_id: PAIR, added_by: DEMO_ME, title: 'The Bear', type: 'series', genre: 'Drama', poster_url: IMG.bear, pinned: false, status: 'want', created_at: hoursAgo(80) },
      { id: watch.fleabag, pair_id: PAIR, added_by: DEMO_HER, title: 'Fleabag', type: 'series', genre: 'Comedy', poster_url: IMG.fleabag, pinned: false, status: 'watched', created_at: hoursAgo(900) },
      { id: watch.dune, pair_id: PAIR, added_by: DEMO_ME, title: 'Dune', type: 'movie', genre: 'Sci-fi', poster_url: IMG.dune, pinned: false, status: 'watched', created_at: hoursAgo(1200) },
    ],
    watch_progress: [
      { item_id: watch.severance, profile_id: DEMO_ME, season: 2, episode: 4, rating: null, review: null },
      { item_id: watch.severance, profile_id: DEMO_HER, season: 2, episode: 7, rating: null, review: null },
      { item_id: watch.fleabag, profile_id: DEMO_ME, season: 2, episode: 6, rating: 5, review: 'The priest!!' },
      { item_id: watch.fleabag, profile_id: DEMO_HER, season: 2, episode: 6, rating: 5, review: 'Perfect' },
      { item_id: watch.dune, profile_id: DEMO_ME, season: null, episode: null, rating: 4, review: 'The sound!' },
    ],
    dreams: [
      { id: id('5'), pair_id: PAIR, owner_id: null, added_by: DEMO_ME, title: 'See the northern lights together', image_url: null, done_at: null, done_photo: null, created_at: hoursAgo(500) },
      { id: id('5'), pair_id: PAIR, owner_id: DEMO_HER, added_by: DEMO_HER, title: 'Adopt a second cat', image_url: IMG.lunaBack, done_at: null, done_photo: null, created_at: hoursAgo(600) },
      { id: id('5'), pair_id: PAIR, owner_id: DEMO_ME, added_by: DEMO_ME, title: 'Run a half marathon', image_url: null, done_at: null, done_photo: null, created_at: hoursAgo(700) },
      { id: id('5'), pair_id: PAIR, owner_id: null, added_by: DEMO_HER, title: 'Eat pastéis de nata in Belém', image_url: null, done_at: ymd(-58), done_photo: IMG.nata, created_at: hoursAgo(3000) },
    ],

    places: [
      { id: places.szimpla, pair_id: PAIR, added_by: DEMO_HER, title: 'Szimpla Kert', category: 'bars', city: 'Budapest', address: 'Kazinczy u. 14', lat: 47.4969, lon: 19.0633, maps_url: null, image_url: IMG.szimpla, note: 'The ruin bar everyone talks about', meeting_event_id: meeting, created_at: hoursAgo(3) },
      { id: places.bastion, pair_id: PAIR, added_by: DEMO_ME, title: 'Fisherman’s Bastion', category: 'nature', city: 'Budapest', address: 'Szentháromság tér', lat: 47.5022, lon: 19.0348, maps_url: null, image_url: null, note: 'Sunrise view over the Danube', meeting_event_id: meeting, created_at: hoursAgo(20) },
      { id: places.thermal, pair_id: PAIR, added_by: DEMO_ME, title: 'Széchenyi Thermal Bath', category: 'activities', city: 'Budapest', address: 'Állatkerti krt. 9-11', lat: 47.5186, lon: 19.0823, maps_url: null, image_url: null, note: null, meeting_event_id: meeting, created_at: hoursAgo(40) },
      { id: places.central, pair_id: PAIR, added_by: DEMO_HER, title: 'Café Central', category: 'coffee', city: 'Vienna', address: 'Herrengasse 14', lat: 48.2104, lon: 16.3654, maps_url: null, image_url: IMG.central, note: 'Next time I visit you!', meeting_event_id: null, created_at: hoursAgo(90) },
      { id: places.nata, pair_id: PAIR, added_by: DEMO_ME, title: 'Pastéis de Belém', category: 'food', city: 'Lisbon', address: 'R. de Belém 84-92', lat: 38.6975, lon: -9.2032, maps_url: null, image_url: IMG.nata, note: null, meeting_event_id: null, created_at: hoursAgo(2200) },
      { id: places.lx, pair_id: PAIR, added_by: DEMO_HER, title: 'LX Factory', category: 'shopping', city: 'Lisbon', address: 'R. Rodrigues de Faria 103', lat: 38.7036, lon: -9.1784, maps_url: null, image_url: null, note: 'Books + coffee', meeting_event_id: null, created_at: hoursAgo(2300) },
    ],
    place_likes: [
      { place_id: places.szimpla, profile_id: DEMO_ME },
      { place_id: places.central, profile_id: DEMO_ME },
      { place_id: places.thermal, profile_id: DEMO_HER },
    ],
    place_visits: [
      { place_id: places.nata, visited_at: ymd(-58), ratings: { [DEMO_ME]: { rating: 5, review: 'Warm, crispy, perfect' }, [DEMO_HER]: { rating: 5, review: 'Ate four' } }, photos: [IMG.nata], review: null },
      { place_id: places.lx, visited_at: ymd(-57), ratings: { [DEMO_HER]: { rating: 4, review: null } }, photos: [], review: null },
    ],

    activity: [
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'place', target_id: places.szimpla, created_at: hoursAgo(3) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'gift', target_id: gifts.scarf, created_at: hoursAgo(7) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'watch', target_id: watch.severance, created_at: hoursAgo(1) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'pet_photo', target_id: posts.find((p) => p.author_id === DEMO_HER && p.caption?.startsWith('Luna found'))?.id, created_at: hoursAgo(1.2) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_ME, kind: 'pet_photo', target_id: posts.find((p) => p.caption?.startsWith('Found Bobby'))?.id, created_at: hoursAgo(3) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_ME, kind: 'place', target_id: places.thermal, created_at: hoursAgo(40) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'place', target_id: places.central, created_at: hoursAgo(90) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_ME, kind: 'watch', target_id: watch.dune2, created_at: hoursAgo(30) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'pet_photo', target_id: posts.find((p) => p.author_id === DEMO_HER && p.caption?.startsWith('Luna has'))?.id, created_at: hoursAgo(50) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_ME, kind: 'trip', target_id: trip, created_at: hoursAgo(200) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_ME, kind: 'gift', target_id: gifts.kallax, created_at: hoursAgo(100) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_ME, kind: 'event', target_id: meeting, created_at: hoursAgo(26) },
      { id: id('6'), pair_id: PAIR, actor_id: DEMO_HER, kind: 'pet_added', target_id: pets.luna, created_at: hoursAgo(28) },
    ],
    push_subscriptions: [],
    pet_of_day: [
      { id: id('w'), pair_id: PAIR, day: ymd(-1), media_id: media.find((m) => m.url === IMG.luna)?.id, post_id: media.find((m) => m.url === IMG.luna)?.post_id, cat_id: pets.luna, created_at: hoursAgo(20) },
      { id: id('w'), pair_id: PAIR, day: ymd(-2), media_id: media.find((m) => m.url === IMG.bobbyBeach)?.id, post_id: media.find((m) => m.url === IMG.bobbyBeach)?.post_id, cat_id: pets.bobby, created_at: hoursAgo(44) },
    ],
    change_requests: [],
    shared_expenses: [
      { id: id('0'), pair_id: PAIR, created_by: DEMO_ME, paid_by: DEMO_ME, title: 'Train tickets to Milan', amount: 184, currency: 'EUR', shares: { [DEMO_ME]: 92, [DEMO_HER]: 92 }, category: 'transport', spent_on: ymd(-3), trip_id: trip, event_id: null, is_settlement: false, created_at: hoursAgo(72) },
      { id: id('0'), pair_id: PAIR, created_by: DEMO_HER, paid_by: DEMO_HER, title: 'Apartment in Brera', amount: 420, currency: 'EUR', shares: { [DEMO_ME]: 210, [DEMO_HER]: 210 }, category: 'stay', spent_on: ymd(-2), trip_id: trip, event_id: null, is_settlement: false, created_at: hoursAgo(50) },
      { id: id('0'), pair_id: PAIR, created_by: DEMO_ME, paid_by: DEMO_ME, title: 'Masha’s birthday cake order', amount: 36, currency: 'EUR', shares: { [DEMO_ME]: 0, [DEMO_HER]: 36 }, category: 'food', spent_on: ymd(-1), trip_id: null, event_id: null, is_settlement: false, created_at: hoursAgo(20) },
      { id: id('0'), pair_id: PAIR, created_by: DEMO_HER, paid_by: DEMO_HER, title: 'Dinner at Time Out Market', amount: 58, currency: 'EUR', shares: { [DEMO_ME]: 29, [DEMO_HER]: 29 }, category: 'food', spent_on: ymd(-58), trip_id: pastTrip, event_id: null, is_settlement: false, created_at: hoursAgo(1400) },
      { id: id('0'), pair_id: PAIR, created_by: DEMO_ME, paid_by: DEMO_ME, title: 'Settled up', amount: 29, currency: 'EUR', shares: { [DEMO_HER]: 29, [DEMO_ME]: 0 }, category: null, spent_on: ymd(-55), trip_id: pastTrip, event_id: null, is_settlement: true, created_at: hoursAgo(1300) },
    ],
  };
}
