import { ReactNode } from 'react';
import { addToCart, money, thumb, toast } from './core';

// Icônes au trait fin (style SF Symbols)
const P: Record<string, string> = {
  search: 'M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-5.2-5.2',
  bag: 'M5 8h14l-1.2 12H6.2L5 8zM9 8V6a3 3 0 016 0v2',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  store: 'M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  auto: 'M12 3a9 9 0 100 18V3z M12 3a9 9 0 010 18',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  moto: 'M5 17a3 3 0 100-6 3 3 0 000 6zM19 17a3 3 0 100-6 3 3 0 000 6zM5 14h6l3-5h3l2 5M9 9h4',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5',
  copy: 'M8 8h11v13H8zM5 16V3h11',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.5',
  box: 'M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9zM3 7.5L12 12l9-4.5M12 12v9',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  // Rayons
  deviceMobile: 'M7 2h10v20H7zM11 18h2',
  television: 'M3 7h18v12H3zM8 3l4 4 4-4',
  dress: 'M9 3h6l-1 4 4 14H6l4-14-1-4z',
  tShirt: 'M8 4l-5 3 2 4 3-1v11h8V10l3 1 2-4-5-3a4 4 0 01-8 0z',
  sneaker: 'M3 17V9l4 1 3 3 7 1 4 2v1zM3 17h18v2H3z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  cookingPot: 'M4 10h16v6a4 4 0 01-4 4H8a4 4 0 01-4-4v-6zM2 10h20M9 6V4M12 6V3M15 6V4',
  basket: 'M3 10h18l-2 10H5L3 10zM7 10l4-6M17 10l-4-6M9 14v3M15 14v3',
  baby: 'M12 21a8 8 0 100-16 8 8 0 000 16zM9 12h.01M15 12h.01M10 16a3 3 0 004 0M12 5c0-1 1-2 2-2',
  wrench: 'M14 6a4 4 0 005 5l-9 9a2 2 0 01-3-3l9-9a4 4 0 01-2-2z',
  hammer: 'M13 6l5 5M10 9l9-6 2 2-6 9M10 9l-7 7 3 3 7-7',
  notebook: 'M6 3h12v18H6zM9 7h6M9 11h6M3 7h3M3 12h3M3 17h3',
  soccerBall: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z',
  tag: 'M3 12V3h9l9 9-9 9-9-9zM7.5 7.5h.01',
};

export function Icon({ name, size = 20, stroke = 1.7 }: { name: string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.tag} />
    </svg>
  );
}
export const catIcon = (n?: string | null) => (n && P[n] ? n : 'tag');
export const TINTS = ['#0B6B4F', '#E8962A', '#8E5B3A', '#2F6F7E', '#B05A4A', '#5E6B3A'];

export interface Product {
  id: string; name: string; description: string | null; photos: string[]; price: number; inStock: boolean; stock: number | null;
  hasWholesale: boolean; wholesalePrice: number | null; wholesaleMinQty: number | null; prepayPercent: number; categoryId: string;
  variants: { id: string; label: string; price: number | null; stock: number | null }[];
  shop?: { id: string; name: string; slug: string; type: string; market: string | null; logoUrl: string | null; isOpen: boolean };
}
export interface ShopCard { id: string; name: string; slug: string; type: string; market: string | null; logoUrl: string | null; storefrontUrl: string | null; productCount?: number; isOpen?: boolean; featured?: boolean }

/** Carte produit : photo, prix sur verre, ajout rapide « + » */
export function ProductCard({ p }: { p: Product }) {
  const quick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (p.variants.length || !p.shop) { location.hash = `/produit/${p.id}`; return; }
    addToCart({ productId: p.id, variantId: null, name: p.name, variantLabel: null, photo: p.photos[0] ?? null, price: p.price, shopId: p.shop.id, shopName: p.shop.name, qty: 1, prepayPercent: p.prepayPercent ?? 100 });
    toast('Ajouté au panier');
  };
  return (
    <a className="pcard" href={`#/produit/${p.id}`}>
      <div className="img">
        {p.photos[0] && <img src={thumb(p.photos[0], 480)} alt="" loading="lazy" />}
        <div className="tags">
          {!p.inStock && <span className="pill light">Épuisé</span>}
          {p.hasWholesale && <span className="pill green">Gros</span>}
          {p.prepayPercent < 100 && <span className="pill accent">Acompte {p.prepayPercent} %</span>}
        </div>
        <span className="price">{money(p.price)}</span>
        {p.inStock && <button className="add" onClick={quick} aria-label={`Ajouter ${p.name} au panier`}><Icon name="plus" size={17} stroke={2.2} /></button>}
      </div>
      <div className="name">{p.name}</div>
      {p.shop && <div className="shop">{p.shop.name}</div>}
    </a>
  );
}

export function ShopTile({ s }: { s: ShopCard }) {
  return (
    <a className="scard" href={`#/boutique/${s.slug}`}>
      {s.logoUrl || s.storefrontUrl ? <img src={thumb(s.logoUrl ?? s.storefrontUrl, 240)} alt="" loading="lazy" /> : <span className="ph" />}
      <div style={{ minWidth: 0 }}>
        <b>{s.name}</b>
        <small>{[s.type === 'GROSSISTE' ? 'Grossiste' : null, s.market, s.productCount != null ? `${s.productCount} produit${(s.productCount ?? 0) > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}</small>
      </div>
    </a>
  );
}

export const GridSkeleton = ({ n = 8 }: { n?: number }) => (
  <div className="grid">{Array.from({ length: n }, (_, i) => <div key={i}><div className="skel" style={{ aspectRatio: '4 / 5', borderRadius: 18 }} /><div className="skel" style={{ height: 13, width: '80%', marginTop: 10 }} /><div className="skel" style={{ height: 12, width: '45%', marginTop: 6 }} /></div>)}</div>
);

export function Empty({ icon = 'box', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={46} stroke={1.3} /><h3>{title}</h3>{text && <p>{text}</p>}{action}</div>;
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, sm }: { value: number; onChange: (n: number) => void; min?: number; sm?: boolean }) {
  return (
    <div className={`stepper${sm ? ' sm' : ''}`}>
      <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Moins"><Icon name={min === 0 && value === 1 ? 'trash' : 'minus'} size={sm ? 15 : 17} /></button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Plus"><Icon name="plus" size={sm ? 15 : 17} /></button>
    </div>
  );
}
