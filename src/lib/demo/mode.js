// Demo mode: the whole app runs on sample data stored in this browser (see demo/fetch.js).

const FLAG = 'demo';

// A full reload (not router.push): the data client is picked once, when the app starts.
const restart = () => window.location.replace(`${window.location.origin}/`);

export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function enableDemo() {
  try {
    localStorage.setItem(FLAG, '1');
  } catch {}
  restart();
}

/** Back to the real account; the sample data is thrown away. */
export async function disableDemo() {
  const { resetDemoData } = await import('./fetch');
  resetDemoData();
  try {
    localStorage.removeItem(FLAG);
  } catch {}
  restart();
}
