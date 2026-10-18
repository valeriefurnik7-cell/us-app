'use client';

import { supabase } from './supabase';
import { useLive } from './useLive';
import { signedUrls } from './media';

const TABLES = ['pet_of_day'];

/** Every Pet of the day, newest first, with its photo and the pet's name. */
async function loadWinners() {
  const { data: rows } = await supabase.from('pet_of_day').select('*').order('day', { ascending: false });
  if (!rows?.length) return [];
  const [{ data: media }, { data: cats }] = await Promise.all([
    supabase.from('cat_post_media').select('id, url').in('id', rows.map((r) => r.media_id)),
    supabase.from('cats').select('id, name').in('id', rows.map((r) => r.cat_id).filter(Boolean)),
  ]);
  const urls = await signedUrls((media ?? []).map((m) => m.url));
  return rows.map((r) => {
    const m = (media ?? []).find((x) => x.id === r.media_id);
    return { ...r, src: m ? urls[m.url] : null, name: (cats ?? []).find((c) => c.id === r.cat_id)?.name ?? 'Mystery pet' };
  });
}

export const usePetsOfDay = () => useLive(loadWinners, TABLES);

export const winnerDate = (day) => new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Draws the trophy card as a 1080×1350 PNG (Instagram portrait) for saving or sharing. */
export async function renderTrophyCard(winner) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // gold frame
  const gold = ctx.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#F7D774');
  gold.addColorStop(0.5, '#D9A21B');
  gold.addColorStop(1, '#F5C451');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, W, H);

  // photo, cropped to fill
  const pad = 36;
  const photoH = H - 320;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pad, pad, W - pad * 2, photoH, 48);
  ctx.clip();
  try {
    const img = await loadImage(winner.src);
    const scale = Math.max((W - pad * 2) / img.width, photoH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, pad + (W - pad * 2 - w) / 2, pad + (photoH - h) / 2, w, h);
  } catch {
    ctx.fillStyle = '#1C1C1E';
    ctx.fillRect(pad, pad, W - pad * 2, photoH);
  }
  ctx.restore();

  // trophy badge
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(pad + 32, pad + 32, 470, 96, 48);
  ctx.fill();
  ctx.fillStyle = '#F5C451';
  ctx.font = '700 64px -apple-system, system-ui, sans-serif';
  ctx.fillText('🏆', pad + 56, pad + 104);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 40px -apple-system, "SF Pro Display", system-ui, sans-serif';
  ctx.fillText('PET OF THE DAY', pad + 150, pad + 94);

  // name and date
  ctx.fillStyle = '#1A1300';
  ctx.font = '800 104px -apple-system, "SF Pro Display", system-ui, sans-serif';
  ctx.fillText(winner.name, pad + 8, photoH + pad + 130);
  ctx.font = '600 44px -apple-system, "SF Pro Text", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(26,19,0,0.7)';
  ctx.fillText(winnerDate(winner.day), pad + 10, photoH + pad + 205);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
