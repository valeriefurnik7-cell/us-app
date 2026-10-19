// Telegram Bot API, server side only. The token comes from @BotFather → /newbot.
const token = process.env.TELEGRAM_BOT_TOKEN;

export const isTelegramConfigured = () => Boolean(token);

export async function telegram(method, body) {
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    ...(body instanceof FormData ? { body } : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  }).catch((e) => ({ json: () => ({ ok: false, description: `network: ${e.message}` }) }));
  return res.json().catch(() => ({ ok: false, description: 'bad response' }));
}

/** Downloads our (private, signed) file so we can hand Telegram the bytes instead of a link it must fetch. */
async function download(url) {
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  return res.blob();
}

/**
 * A pet post as Telegram sees it: one photo, or an album of up to 10 (Telegram's limit).
 * `media` are signed URLs; the files are uploaded to Telegram directly.
 * Returns Telegram's answer ({ ok, description }).
 */
export async function sendPetPost(chatId, { media, caption }) {
  if (!media.length) return telegram('sendMessage', { chat_id: chatId, text: caption });
  const files = await Promise.all(media.slice(0, 10).map(async (m) => ({ ...m, blob: await download(m.url) })));
  const ready = files.filter((f) => f.blob);
  if (!ready.length) return { ok: false, description: 'couldn’t download the photo from storage' };

  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (ready.length === 1) {
    const [f] = ready;
    const field = f.type === 'video' ? 'video' : 'photo';
    form.append(field, f.blob, f.type === 'video' ? 'pet.mp4' : 'pet.jpg');
    form.append('caption', caption);
    return telegram(f.type === 'video' ? 'sendVideo' : 'sendPhoto', form);
  }
  ready.forEach((f, i) => form.append(`file${i}`, f.blob, f.type === 'video' ? `pet${i}.mp4` : `pet${i}.jpg`));
  form.append(
    'media',
    JSON.stringify(ready.map((f, i) => ({ type: f.type === 'video' ? 'video' : 'photo', media: `attach://file${i}`, ...(i === 0 ? { caption } : {}) })))
  );
  return telegram('sendMediaGroup', form);
}
