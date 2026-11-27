import { useEffect, useState } from 'react';
import { api, phoneFmt, thumb, useApi } from '../core';
import { catIcon, Empty, GridSkeleton, Icon, Product, ProductCard, ShopCard, ShopTile, TINTS } from '../ui';
import { Category } from './Home';

const DAYS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Tous les rayons et leurs sous-rayons */
export function Departments() {
  const { data } = useApi<Category[]>('/categories');
  return (
    <>
      <h1 className="page-title">Rayons</h1>
      {!data ? <GridSkeleton n={6} /> : (
        <div className="shops" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginTop: 14 }}>
          {data.map((c, i) => (
            <div key={c.id} className="group on-bg">
              <a className="cell" href={`#/rayon/${c.id}`}>
                <span className="ico" style={{ background: TINTS[i % TINTS.length] }}><Icon name={catIcon(c.icon)} size={17} /></span>
                <div className="grow"><b>{c.name}</b></div><Icon name="chevron" size={16} />
              </a>
              {(c.children ?? []).map((k) => <a key={k.id} className="cell" href={`#/rayon/${k.id}`} style={{ paddingLeft: 58 }}><div className="grow">{k.name}</div><Icon name="chevron" size={14} /></a>)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Annuaire des boutiques : recherche, marchés, boutiques ou grossistes */
export function Shops() {
  const meta = useApi<{ marketCounts: Record<string, number> }>('/shops/meta');
  const [q, setQ] = useState('');
  const [market, setMarket] = useState('');
  const [type, setType] = useState('');
  const [items, setItems] = useState<ShopCard[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams({ limit: '24', page: '1', ...(q.trim() ? { q: q.trim() } : {}), ...(market ? { market } : {}), ...(type ? { type } : {}) });
      api<{ items: ShopCard[]; pages: number; total: number }>(`/shops?${p}`).then((r) => { setItems(r.items); setPage(1); setPages(r.pages); setTotal(r.total); }).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, market, type]);
  const more = () => {
    const p = new URLSearchParams({ limit: '24', page: String(page + 1), ...(q.trim() ? { q: q.trim() } : {}), ...(market ? { market } : {}), ...(type ? { type } : {}) });
    api<{ items: ShopCard[] }>(`/shops?${p}`).then((r) => { setItems((o) => [...(o ?? []), ...r.items]); setPage(page + 1); }).catch(() => {});
  };
  const markets = Object.entries(meta.data?.marketCounts ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <>
      <h1 className="page-title">Boutiques</h1>
      <div className="filters" style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search" style={{ maxWidth: 360 }}><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, marché, allée…" aria-label="Rechercher une boutique" /></div>
          <div className="seg" style={{ minWidth: 260 }}>
            {[['', 'Toutes'], ['BOUTIQUE', 'Boutiques'], ['GROSSISTE', 'Grossistes']].map(([k, v]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{v}</button>)}
          </div>
        </div>
        {markets.length > 0 && (
          <div className="chips" style={{ marginTop: 10 }}>
            <button className={`chip green${!market ? ' on' : ''}`} onClick={() => setMarket('')}>Tous les marchés</button>
            {markets.map(([m, n]) => <button key={m} className={`chip green${market === m ? ' on' : ''}`} onClick={() => setMarket(m)}>{m} · {n}</button>)}
          </div>
        )}
      </div>
      <div className="count">{items ? `${total} boutique${total > 1 ? 's' : ''}` : ' '}</div>
      {!items ? <GridSkeleton n={6} /> : !items.length ? <Empty icon="store" title="Aucune boutique" text="Essayez un autre nom ou un autre marché." /> : <div className="shops">{items.map((s) => <ShopTile key={s.id} s={s} />)}</div>}
      {items && page < pages && <div style={{ textAlign: 'center', margin: '24px 0' }}><button className="btn gray" onClick={more}>Voir plus</button></div>}
    </>
  );
}

interface ShopFull extends ShopCard {
  description: string | null; location: string | null; phone: string | null; hours: { open: string; close: string; days: number[] } | null;
  productCount: number; shelves: { id: string; name: string; count: number }[];
}

/** Page d'une boutique : vitrine, informations, rayons, produits */
export function ShopPage({ slug }: { slug: string }) {
  const { data: s, error } = useApi<ShopFull>(`/shops/${slug}`);
  const [shelf, setShelf] = useState('');
  const [items, setItems] = useState<Product[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  useEffect(() => {
    if (!s) return;
    setItems(null);
    api<{ items: Product[]; pages: number }>(`/products?${new URLSearchParams({ shopId: s.id, sort: 'new', limit: '24', ...(shelf ? { categoryId: shelf } : {}) })}`).then((r) => { setItems(r.items); setPage(1); setPages(r.pages); }).catch(() => setItems([]));
  }, [s, shelf]);
  if (error) return <Empty icon="store" title="Boutique indisponible" text={error} />;
  if (!s) return <div className="skel" style={{ height: 260, marginTop: 20, borderRadius: 28 }} />;
  const more = () => api<{ items: Product[] }>(`/products?${new URLSearchParams({ shopId: s.id, sort: 'new', limit: '24', page: String(page + 1), ...(shelf ? { categoryId: shelf } : {}) })}`).then((r) => { setItems((o) => [...(o ?? []), ...r.items]); setPage(page + 1); });
  return (
    <>
      <div className="crumbs"><a href="#/">Accueil</a><span>›</span><a href="#/boutiques">Boutiques</a><span>›</span><span>{s.name}</span></div>
      <section style={{ marginTop: 14, borderRadius: 28, overflow: 'hidden', position: 'relative', background: 'var(--fill)', aspectRatio: '16 / 5', minHeight: 160 }} className={s.storefrontUrl ? '' : 'wax'}>
        {s.storefrontUrl && <img src={thumb(s.storefrontUrl, 1200)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </section>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginTop: -40, padding: '0 20px', position: 'relative' }}>
        <div style={{ width: 88, height: 88, borderRadius: 22, border: '4px solid var(--bg)', overflow: 'hidden', background: 'var(--card)', flex: '0 0 88px', boxShadow: 'var(--shadow)' }}>{s.logoUrl && <img src={thumb(s.logoUrl, 240)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 360px)', gap: 24, marginTop: 14 }} className="shop-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 36px)' }}>{s.name}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{[s.type === 'GROSSISTE' ? 'Grossiste' : 'Boutique', s.market, `${s.productCount} produit${s.productCount > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</p>
          <p className="status" style={{ marginTop: 10, color: s.isOpen === false ? 'var(--muted)' : 'var(--ok)' }}>{s.isOpen === false ? 'Fermée' : 'Ouverte'}{s.hours && <span className="muted" style={{ fontWeight: 400 }}> · {s.hours.open} – {s.hours.close}</span>}</p>
          {s.description && <p style={{ marginTop: 12, color: 'var(--ink2)' }}>{s.description}</p>}
        </div>
        <div className="group on-bg">
          <div className="cell"><Icon name="pin" /><div className="grow">{s.location ?? 'Adjamé'}<small>{s.market}</small></div></div>
          {s.hours && <div className="cell"><Icon name="clock" /><div className="grow">{s.hours.open} – {s.hours.close}<small>{s.hours.days.map((d) => DAYS[d]).join(', ')}</small></div></div>}
          {s.phone && <a className="cell" href={`tel:${s.phone}`}><Icon name="phone" /><div className="grow">{phoneFmt(s.phone)}<small>Appeler la boutique</small></div></a>}
        </div>
      </div>
      {s.shelves.length > 1 && (
        <div className="filters" style={{ marginTop: 20 }}>
          <div className="chips">
            <button className={`chip green${!shelf ? ' on' : ''}`} onClick={() => setShelf('')}>Tout · {s.productCount}</button>
            {s.shelves.map((r) => <button key={r.id} className={`chip green${shelf === r.id ? ' on' : ''}`} onClick={() => setShelf(r.id)}>{r.name} · {r.count}</button>)}
          </div>
        </div>
      )}
      <div style={{ marginTop: 18 }}>
        {!items ? <GridSkeleton /> : !items.length ? <Empty icon="box" title="Bientôt en rayon" text="Cette boutique ajoute ses produits." /> : <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </div>
      {items && page < pages && <div style={{ textAlign: 'center', margin: '24px 0' }}><button className="btn gray" onClick={more}>Voir plus</button></div>}
    </>
  );
}
