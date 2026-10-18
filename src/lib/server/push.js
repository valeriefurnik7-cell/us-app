import webpush from 'web-push';

const SUBJECT = 'https://us-app-henna.vercel.app';

let configured = false;
export const isPushConfigured = () => configure();

function configure() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(SUBJECT, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Sends one notification to each target. Returns endpoints that are gone for good
 * (the phone unsubscribed or the app was removed) so the caller can forget them.
 */
export async function sendPushes(targets, { title, body, url }, failures = []) {
  if (!configure()) return [];
  const payload = JSON.stringify({ title, body, url });
  const dead = [];
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: t.keys }, payload, { TTL: 60 * 60 * 12 });
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) dead.push(t.endpoint);
        failures.push(`${e.statusCode ?? ''} ${e.body ?? e.message}`.trim());
      }
    })
  );
  return dead;
}
