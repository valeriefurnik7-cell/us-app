/**
 * Amounts as people type them on an iPhone: "12,50", "12.50", "18 000". Returns NaN for empty/garbage.
 * (iOS shows a comma on the decimal keyboard in most of Europe, and <input type="number"> drops it.)
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'number') return value;
  return Number(String(value).replace(/[\s  ]/g, '').replace(',', '.'));
}

export const toAmount = (value) => {
  const n = toNumber(value);
  return Number.isFinite(n) ? n : 0;
};
