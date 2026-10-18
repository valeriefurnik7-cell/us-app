// An invite link may be opened before signing in; keep the code until the pair is joined.
const KEY = 'pendingInvite';

export function readPendingInvite() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function savePendingInvite(code) {
  try {
    localStorage.setItem(KEY, code);
  } catch {}
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export const inviteUrl = (code) => `${window.location.origin}/invite/${code}`;
