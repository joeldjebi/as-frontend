import { useEffect, useState, useSyncExternalStore } from 'react';

export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3100';

// ---------- Mise en forme ----------
export const money = (n: number | null | undefined) => `${Math.round(n ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;
export const phoneFmt = (p?: string | null) => {
  const m = /^\+225(\d{10})$/.exec(p ?? '');
  return m ? `+225 ${m[1].replace(/(\d{2})(?=\d)/g, '$1 ')}` : p ?? '';
};
/** Miniature servie par l'API (WebP, largeur 240 / 480 / 800 / 1200) */
export const thumb = (path: string | null | undefined, w = 480) => {
  if (!path) return '';
  if (!path.startsWith('/uploads/')) return path.startsWith('http') ? path : API + path;
  const size = w <= 240 ? 240 : w <= 480 ? 480 : w <= 800 ? 800 : 1200;
  return `${API}${path}?w=${size}`;
};
export const dateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- Petit magasin réactif ----------
function store<T>(initial: T, key?: string) {
  let value: T = initial;
  if (key) {
    try { const raw = localStorage.getItem(key); if (raw) value = JSON.parse(raw); } catch { /* stockage indisponible */ }
  }
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set(v: T) {
      value = v;
      if (key) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }
      subs.forEach((f) => f());
    },
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
  };
}
export function useStore<T>(s: { get: () => T; subscribe: (f: () => void) => () => void }) {
  return useSyncExternalStore(s.subscribe, s.get, s.get);
}

// ---------- Session ----------
export interface User { id: string; name: string; phone: string; resellerStatus: string; addresses: Address[] }
export interface Address { id: string; label: string; address: string; landmark: string | null; lat: number; lng: number }
export const session = store<{ token: string | null; user: User | null }>({ token: null, user: null }, 'as_site_session');

export class ApiError extends Error {}
const GENERIC = 'Une erreur est survenue. Réessayez dans un instant.';

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = session.get().token;
  let res: Response;
  try {
    res = await fetch(API + path, {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError('Impossible de joindre Adjamé-Smart. Vérifiez votre connexion.');
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) session.set({ token: null, user: null });
  if (!res.ok) {
    const m = (data as { message?: unknown } | null)?.message;
    throw new ApiError(res.status >= 500 ? GENERIC : Array.isArray(m) ? m.join(', ') : typeof m === 'string' && m ? m : GENERIC);
  }
  return data as T;
}
export const errText = (e: unknown) => (e instanceof ApiError ? e.message : GENERIC);

export async function refreshMe() {
  if (!session.get().token) return;
  try { session.set({ ...session.get(), user: await api<User>('/auth/me') }); } catch { /* session expirée : déjà gérée */ }
}

/** Lecture simple avec chargement et erreur */
export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: !!path });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) { setState({ data: null, error: null, loading: false }); return; }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<T>(path).then((data) => live && setState({ data, error: null, loading: false })).catch((e) => live && setState({ data: null, error: errText(e), loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, n, ...deps]);
  return { ...state, reload: () => setN((x) => x + 1) };
}

// ---------- Panier (même logique que l'app) ----------
export interface CartItem {
  productId: string; variantId: string | null; name: string; variantLabel: string | null; photo: string | null;
  price: number; shopId: string; shopName: string; qty: number; prepayPercent: number;
}
export const cart = store<CartItem[]>([], 'as_site_cart');
export const lineNow = (i: CartItem) => (i.prepayPercent >= 100 ? i.price * i.qty : Math.round((i.price * i.qty * i.prepayPercent) / 100));
export const cartTotals = (items: CartItem[]) => {
  const total = items.reduce((t, i) => t + i.price * i.qty, 0);
  const now = items.reduce((t, i) => t + lineNow(i), 0);
  return { total, now, later: total - now, count: items.reduce((t, i) => t + i.qty, 0) };
};
export function addToCart(item: CartItem) {
  const items = [...cart.get()];
  const found = items.find((i) => i.productId === item.productId && i.variantId === item.variantId);
  if (found) found.qty += item.qty; else items.push(item);
  cart.set(items.map((i) => ({ ...i })));
}
export function setQty(item: CartItem, qty: number) {
  cart.set(qty <= 0 ? cart.get().filter((i) => i !== item) : cart.get().map((i) => (i === item ? { ...i, qty } : i)));
}

// ---------- Thème (partagé avec la vitrine) ----------
export type Theme = 'auto' | 'light' | 'dark';
export const theme = store<Theme>('auto');
try { const t = localStorage.getItem('as_site_theme'); if (t === 'light' || t === 'dark') theme.set(t); } catch { /* ignore */ }
export function setTheme(t: Theme) {
  theme.set(t);
  if (t === 'auto') { delete document.documentElement.dataset.theme; try { localStorage.removeItem('as_site_theme'); } catch { /* ignore */ } }
  else { document.documentElement.dataset.theme = t; try { localStorage.setItem('as_site_theme', t); } catch { /* ignore */ } }
}
export const isDark = () => (theme.get() === 'dark') || (theme.get() === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);

// ---------- Navigation (#/…) ----------
export function useRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => { setHash(location.hash); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const raw = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query) };
}
export const go = (to: string) => { location.hash = to; };

// ---------- Messages ----------
export const toasts = store<{ id: number; text: string } | null>(null);
let tid = 0;
export function toast(text: string) {
  const id = ++tid;
  toasts.set({ id, text });
  setTimeout(() => { if (toasts.get()?.id === id) toasts.set(null); }, 2600);
}

/** Demande de connexion (ouvre la fenêtre de connexion, puis exécute la suite) */
export const authPrompt = store<{ reason: string; then?: () => void } | null>(null);
export function requireAuth(reason: string, then: () => void) {
  if (session.get().token) then();
  else authPrompt.set({ reason, then });
}
