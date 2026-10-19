import { createClient } from '@supabase/supabase-js';
import { isTelegramConfigured, telegram } from '@/lib/server/telegram';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

const HELLO = 'Hi! I send you the pets from your Us chat.\n\nTo connect, open Us → Settings → Telegram → Connect.';

/** Telegram calls this for every message to the bot. Only /start <code> and /stop matter. */
export async function POST(request) {
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('forbidden', { status: 403 });
  const update = await request.json().catch(() => ({}));
  const message = update.message;
  const chat = message?.chat?.id;
  if (!chat || message.chat.type !== 'private') return Response.json({ ok: true });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [command, code] = (message.text ?? '').trim().split(/\s+/);

  if (command === '/start' && code) {
    const { data: name } = await supabase.rpc('telegram_link', { code, chat });
    await telegram('sendMessage', {
      chat_id: chat,
      text: name ? `Connected, ${name}! 🐾 Pets from your friend will arrive here.\n\nSend /stop to disconnect.` : 'This link has expired. Open Us → Settings → Telegram → Connect again.',
    });
  } else if (command === '/stop') {
    await supabase.rpc('telegram_unlink', { chat });
    await telegram('sendMessage', { chat_id: chat, text: 'Disconnected. You can connect again from Us → Settings.' });
  } else {
    await telegram('sendMessage', { chat_id: chat, text: HELLO });
  }
  return Response.json({ ok: true });
}

/**
 * One-time setup after adding the env vars: open /api/telegram?setup=<TELEGRAM_WEBHOOK_SECRET>
 * in a browser and Telegram starts sending the bot's messages here.
 */
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  if (!isTelegramConfigured() || !secret) return Response.json({ error: 'Add TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in Vercel, then redeploy.' });
  if (params.get('setup') !== secret) return new Response('forbidden', { status: 403 });
  const origin = new URL(request.url).origin;
  const result = await telegram('setWebhook', { url: `${origin}/api/telegram`, secret_token: secret, allowed_updates: ['message'] });
  await telegram('setMyCommands', { commands: [{ command: 'stop', description: 'Stop sending me pets' }] });
  return Response.json(result?.ok ? { ok: true, webhook: `${origin}/api/telegram` } : { ok: false, telegram: result });
}
