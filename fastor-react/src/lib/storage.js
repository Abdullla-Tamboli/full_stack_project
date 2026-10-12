export function readStored(key, fallback, storage = localStorage) {
  try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; }
}
export function writeStored(key, value, storage = localStorage) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* App remains usable when browser storage is unavailable. */ }
}
export function readSession() {
  const session = readStored('fastor-session', null, sessionStorage);
  if (!session || typeof session.token !== 'string') return null;
  try {
    const base64 = session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;
  } catch { return null; }
  return { token: session.token, name: typeof session.name === 'string' ? session.name : 'Karan' };
}
