'use client';

import { supabase } from './supabase';

// Accent colors for the pair (light / dark variants, like the iOS system colors).
export const ACCENTS = [
  { id: 'purple', label: 'Purple', light: '#6E5AE6', dark: '#8B7CF6' },
  { id: 'pink', label: 'Pink', light: '#E0457B', dark: '#FF6B9D' },
  { id: 'blue', label: 'Blue', light: '#007AFF', dark: '#0A84FF' },
  { id: 'green', label: 'Green', light: '#1E9E5A', dark: '#30D158' },
];

/** pairs.theme holds JSON: { accent, cardPhoto } — shared by both of you. */
export function parseTheme(pair) {
  try {
    return { accent: 'purple', cardPhoto: null, ...JSON.parse(pair?.theme || '{}') };
  } catch {
    return { accent: 'purple', cardPhoto: null };
  }
}

export async function saveTheme(pair, patch) {
  const next = { ...parseTheme(pair), ...patch };
  return supabase.from('pairs').update({ theme: JSON.stringify(next) }).eq('id', pair.id);
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function shift(hex, amount) {
  // Lighten/darken in HSL, the way Konsta derives its tint and shade.
  let [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  l = Math.min(1, Math.max(0, l + amount));
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  [r, g, b] = s === 0 ? [l, l, l] : [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
  return [r, g, b].map((v) => Math.round(v * 255));
}

const triple = (arr) => arr.join(' ');

function vars(hex) {
  return [
    `--accent: ${hex};`,
    `--k-color-primary: rgb(${triple(rgb(hex))});`,
    `--k-color-ios-primary: rgb(${triple(rgb(hex))});`,
    `--k-color-ios-primary-tint: rgb(${triple(shift(hex, 0.08))});`,
    `--k-color-ios-primary-shade: rgb(${triple(shift(hex, -0.08))});`,
  ].join(' ');
}

/** Swaps the accent everywhere (our tokens and Konsta's primary) for both themes. */
export function applyAccent(id) {
  const accent = ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
  let style = document.getElementById('accent-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'accent-style';
    document.head.appendChild(style);
  }
  style.textContent = `html:root { ${vars(accent.light)} } html.dark { ${vars(accent.dark)} }`;
}
