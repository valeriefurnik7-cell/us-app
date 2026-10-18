import { isPushConfigured } from '@/lib/server/push';

/** Whether the server can send notifications at all (both VAPID keys present). Reveals no keys. */
export async function GET() {
  return Response.json({ configured: isPushConfigured(), publicKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY), privateKey: Boolean(process.env.VAPID_PRIVATE_KEY) });
}
