// Telegram Bot API, server side only. The token comes from @BotFather → /newbot.
const token = process.env.TELEGRAM_BOT_TOKEN;

export const isTelegramConfigured = () => Boolean(token);

export async function telegram(method, body) {
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res ? res.json().catch(() => null) : null;
}

/**
 * A pet post as Telegram sees it: one photo, or an album of up to 10 (Telegram's limit).
 * `media` are signed URLs Telegram downloads itself.
 */
export async function sendPetPost(chatId, { media, caption }) {
  if (!media.length) return telegram('sendMessage', { chat_id: chatId, text: caption });
  if (media.length === 1) {
    const [m] = media;
    return telegram(m.type === 'video' ? 'sendVideo' : 'sendPhoto', { chat_id: chatId, [m.type === 'video' ? 'video' : 'photo']: m.url, caption });
  }
  return telegram('sendMediaGroup', {
    chat_id: chatId,
    media: media.slice(0, 10).map((m, i) => ({ type: m.type === 'video' ? 'video' : 'photo', media: m.url, ...(i === 0 ? { caption } : {}) })),
  });
}
