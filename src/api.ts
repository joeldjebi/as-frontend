export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3100';

// ---------- Types ----------
export type StaffRole = 'SUPER_ADMIN' | 'MODERATOR' | 'SUPPORT';
export const STAFF_LABEL: Record<StaffRole, string> = { SUPER_ADMIN: 'Super Admin', MODERATOR: 'Modérateur', SUPPORT: 'Support' };
export interface User {
  id: string; name: string; phone: string; role: 'CUSTOMER' | 'ADMIN'; staffRole: StaffRole | null; active: boolean;
  avatarUrl: string | null; resellerStatus: ResellerStatus; createdAt: string;
}
export type ResellerStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
export const RESELLER_STATUS: Record<ResellerStatus, [string, string]> = {
  NONE: ['—', 'gray'], PENDING: ['À vérifier', 'orange'], APPROVED: ['Revendeur', 'green'], REJECTED: ['Refusé', 'red'],
};
export type ShopStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export const SHOP_STATUS: Record<ShopStatus, [string, string]> = {
  PENDING: ['À vérifier', 'orange'], APPROVED: ['En ligne', 'green'], REJECTED: ['Refusée', 'red'], SUSPENDED: ['Suspendue', 'gray'], DRAFT: ['Brouillon', 'gray'],
};
export interface ShopRow {
  id: string; name: string; type: 'BOUTIQUE' | 'GROSSISTE'; market: string | null; location: string | null; status: ShopStatus;
  submittedAt: string | null; createdAt: string; reviewNote: string | null; storefrontUrl: string | null; phone: string | null;
  ownerName: string; ownerPhone: string;
}
export interface ShopEvent { at: string; action: 'CREATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REACTIVATED'; by?: string; note?: string }
export interface Shop extends Omit<ShopRow, 'ownerName' | 'ownerPhone'> {
  slug: string; description: string | null; lat: number | null; lng: number | null; categoryIds: string[];
  logoUrl: string | null; ownerIdType: string | null; ownerIdNumber: string | null; tradeRegister: string | null;
  hours: { open: string; close: string; days: number[] } | null; isOpen: boolean; featured: boolean; reviewedBy: string | null; reviewedAt: string | null;
  history: ShopEvent[]; ownerIdFrontLink: string | null; ownerIdBackLink: string | null;
  required: { key: string; label: string; ok: boolean }[];
  owner: { id: string; name: string; phone: string; createdAt: string } | null; categories: { id: string; name: string }[];
}
export interface Category { id: string; parentId: string | null; name: string; slug: string; icon: string | null; sortOrder: number; active: boolean; children?: Category[] }
export interface Dashboard {
  customers: number; customersWeek: number; shopsApproved: number; shopsPending: number; shopsDraft: number;
  resellersPending: number; resellers: number; categories: number; products: number; productsReported: number;
}
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'REMOVED';
export const PRODUCT_STATUS: Record<ProductStatus, [string, string]> = { ACTIVE: ['Visible', 'green'], INACTIVE: ['Masqué', 'gray'], REMOVED: ['Retiré', 'red'] };
export interface AdminProduct {
  id: string; shopId: string; shopName: string; name: string; description: string | null; photos: string[]; price: number;
  wholesalePrice: number | null; wholesaleMinQty: number | null; status: ProductStatus; moderationNote: string | null; moderatedBy: string | null;
  reports: number; reportsList: { at: string; by: string; reason: string }[]; views: number; totalStock: number | null; createdAt: string;
  variants: { id: string; label: string; price: number | null; stock: number | null }[];
}
export interface ResellerRow {
  id: string; name: string; phone: string; resellerStatus: ResellerStatus; idPhotoLink: string | null;
  reseller: { businessName: string; commune: string | null; idPhotoUrl: string | null; shopPhotoUrl: string | null; submittedAt: string; reviewedBy?: string; reviewedAt?: string; note?: string | null } | null;
}

// ---------- Formatage ----------
export const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
export const photoUrl = (path: string) => API_URL + path;
export const initial = (name?: string | null) => (name?.trim()?.[0] ?? '?').toUpperCase();

// ---------- Session ----------
// Espace boutique (boutique.vite.ci) et back-office de l'équipe : sessions séparées
const TOKEN_KEY = document.documentElement.dataset.app === 'boutique' ? 'asb_token' : 'as_token';
let token = localStorage.getItem(TOKEN_KEY);
export const getToken = () => token;
export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Erreur prévue pour l'utilisateur (message clair en français) */
export class UserError extends Error {}
export const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans un instant.';
const OFFLINE_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
export const errText = (e: unknown) => (e instanceof UserError && e.message ? e.message : GENERIC_ERROR);

function apiMessage(status: number, data: { message?: unknown } | null, fallback: string) {
  if (status >= 500) return GENERIC_ERROR;
  const m = data?.message;
  const text = Array.isArray(m) ? m.join(', ') : typeof m === 'string' ? m : '';
  return text.trim() || fallback;
}

async function send(input: string, init: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new UserError(OFFLINE_ERROR);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await send(API_URL + path, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    setToken(null);
    location.reload();
  }
  if (!res.ok) throw new UserError(apiMessage(res.status, data, GENERIC_ERROR));
  return data as T;
}

/** Envoi d'une photo (produit, logo, devanture) : renvoie son adresse /uploads/… */
export async function uploadPhoto(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new UserError('Photo trop lourde (5 Mo maximum)');
  const fd = new FormData();
  fd.append('file', file);
  const res = await send(API_URL + '/uploads', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new UserError(apiMessage(res.status, data, 'Envoi de la photo impossible'));
  return (data as { url: string }).url;
}
