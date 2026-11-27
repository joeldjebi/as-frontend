import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Temps réel (Socket.IO), partagé par le back-office, l'espace boutique et la boutique en ligne.
 * Une seule connexion par onglet : ouverte quand un jeton est présent, rouverte au changement
 * de session, fermée à la déconnexion. Les écrans s'abonnent aux événements avec `useLive`.
 */

export interface Notice { title: string; body: string }
export interface OrderChanged { id: string; number: string; status: string; deliveryStatus: string | null; notice: Notice | null }
export interface OrderOffers { id: string; number: string; notice: Notice | null }
interface Events {
  'order:changed': OrderChanged;
  'order:offers': OrderOffers;
  /** Reconnexion après une coupure : les écrans relisent leurs données (événements manqués) */
  resync: void;
}
type Name = keyof Events;

let socket: Socket | null = null;
let current: { base: string; token: string } | null = null;
const listeners = new Map<Name, Set<(p: never) => void>>();

function dispatch<E extends Name>(event: E, payload: Events[E]) {
  listeners.get(event)?.forEach((fn) => {
    try { (fn as (p: Events[E]) => void)(payload); } catch { /* un écran en erreur ne bloque pas les autres */ }
  });
}

/** Ouvre (ou ferme, sans jeton) la connexion temps réel vers l'API `base` */
export function connectLive(base: string, token: string | null | undefined) {
  if (current && token && current.base === base && current.token === token) return;
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  current = null;
  if (!token) return;
  current = { base, token };
  let connectedOnce = false;
  const s = io(base, { path: '/socket.io', transports: ['websocket'], auth: { token } });
  s.on('connect', () => {
    if (connectedOnce) dispatch('resync', undefined);
    connectedOnce = true;
  });
  s.on('order:changed', (p: OrderChanged) => dispatch('order:changed', p));
  s.on('order:offers', (p: OrderOffers) => dispatch('order:offers', p));
  socket = s;
}

export function onLive<E extends Name>(event: E, fn: (p: Events[E]) => void) {
  let set = listeners.get(event);
  if (!set) listeners.set(event, (set = new Set()));
  set.add(fn as (p: never) => void);
  return () => { set!.delete(fn as (p: never) => void); };
}

/** Abonnement React : `fn` peut changer à chaque rendu sans réabonner */
export function useLive<E extends Name>(event: E, fn: (p: Events[E]) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => onLive(event, (p) => ref.current(p)), [event]);
}

/** Relit des données liées aux commandes : à chaque changement et après une reconnexion */
export function useOrdersRefresh(reload: () => void, filter?: (p: OrderChanged) => boolean) {
  useLive('order:changed', (p) => { if (!filter || filter(p)) reload(); });
  useLive('resync', () => reload());
}

/** Prévient l'utilisateur à chaque `notice` reçu (bandeau dans la page + notification si l'onglet est caché) */
/** Annonces d'un espace : `audience` = 'customer' (site client), 'shop' (espace boutique) ou 'admin' (équipe) */
export function useNotices(audience: 'customer' | 'shop' | 'admin', show: (text: string) => void, link: (orderId: string) => void) {
  const handle = (p: { id: string; audience?: string; notice: Notice | null }) => {
    if (!p.notice || (p.audience && p.audience !== audience)) return;
    show(p.notice.body ? `${p.notice.title} · ${p.notice.body}` : p.notice.title);
    browserNotify(p.notice, p.id, () => link(p.id));
  };
  useLive('order:changed', handle);
  useLive('order:offers', handle);
}

// ---------- Notifications du navigateur ----------
const supported = () => typeof window !== 'undefined' && 'Notification' in window;

function browserNotify(n: Notice, tag: string, onClick: () => void) {
  if (!supported() || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    const note = new Notification(n.title, { body: n.body, tag: `${tag}:${n.title}` });
    note.onclick = () => { window.focus(); onClick(); note.close(); };
  } catch { /* certains navigateurs mobiles n'acceptent que les notifications du service worker */ }
}

/** État de l'autorisation, et demande (à appeler seulement sur un clic de l'utilisateur) */
export function useNotifyPermission() {
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(supported() ? Notification.permission : 'unsupported');
  const ask = async () => {
    if (!supported()) return;
    try { setPerm(await Notification.requestPermission()); } catch { setPerm(Notification.permission); }
  };
  return { perm, ask };
}
