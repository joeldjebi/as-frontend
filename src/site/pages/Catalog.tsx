import { useEffect, useMemo, useRef, useState } from 'react';
import { api, errText, useApi } from '../core';
import { Empty, GridSkeleton, Product, ProductCard, ShopTile, ShopCard } from '../ui';
import { Category } from './Home';

const SORTS: Record<string, string> = { new: 'Nouveautés', popular: 'Populaires', price_asc: 'Prix croissant', price_desc: 'Prix décroissant' };
const PRICES: [string, string, number | null, number | null][] = [
  ['', 'Tous les prix', null, null], ['0-5000', 'Moins de 5 000 F', null, 5000], ['5000-20000', '5 000 à 20 000 F', 5000, 20000],
  ['20000-50000', '20 000 à 50 000 F', 20000, 50000], ['50000-150000', '50 000 à 150 000 F', 50000, 150000], ['150000-', 'Plus de 150 000 F', 150000, null],
];
const SELECTIONS: Record<string, { title: string; base: Record<string, string> }> = {
  new: { title: 'Nouveautés', base: { sort: 'new' } },
  popular: { title: 'Les plus vus', base: { sort: 'popular' } },
  cheap: { title: 'Petits prix', base: { sort: 'popular', maxPrice: '5000' } },
  wholesale: { title: 'Vente en gros', base: { sort: 'popular', wholesale: 'true' } },
};

/** Liste de produits : rayon, recherche, sélection ou marché ; filtres collants, chargement progressif */
export default function Catalog({ kind, arg, query }: { kind: string; arg?: string; query: URLSearchParams }) {
  const cats = useApi<Category[]>(kind === 'rayon' ? '/categories' : null);
  const meta = useApi<{ marketCounts: Record<string, number> }>('/shops/meta');
  const sel = kind === 'selection' ? SELECTIONS[arg ?? 'new'] ?? SELECTIONS.new : null;
  const q = kind === 'recherche' ? query.get('q') ?? '' : '';

  // Rayon : parent (avec sous-rayons) ou sous-rayon
  const flat = (cats.data ?? []).flatMap((c) => [c, ...(c.children ?? []).map((k) => ({ ...k, parent: c }))]) as (Category & { parent?: Category })[];
  const cat = kind === 'rayon' ? flat.find((c) => c.id === arg) : undefined;
  const parent = cat?.parent ?? cat;
  const kids = parent?.children ?? [];

  const [sort, setSort] = useState(sel?.base.sort ?? (q ? 'popular' : 'new'));
  const [price, setPrice] = useState('');
  const [market, setMarket] = useState(kind === 'marche' ? arg ?? '' : '');
  const [wholesale, setWholesale] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);

  const params = useMemo(() => {
    const [, , lo, hi] = PRICES.find((p) => p[0] === price) ?? PRICES[0];
    const p: Record<string, string> = { ...(sel?.base ?? {}), sort, limit: '24' };
    if (q) p.q = q;
    if (kind === 'rayon' && arg) p.categoryId = arg;
    if (market) p.market = market;
    if (wholesale) p.wholesale = 'true';
    if (inStock) p.inStock = 'true';
    if (lo != null) p.minPrice = String(lo);
    if (hi != null) p.maxPrice = String(hi);
    return p;
  }, [sel, sort, q, kind, arg, market, wholesale, inStock, price]);

  const load = async (next: number, reset: boolean) => {
    const g = reset ? ++gen.current : gen.current;
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ items: Product[]; page: number; pages: number; total: number }>(`/products?${new URLSearchParams({ ...params, page: String(next) })}`);
      if (g !== gen.current) return;
      setItems((old) => (reset ? r.items : [...old, ...r.items]));
      setPage(r.page);
      setPages(r.pages);
      setTotal(r.total);
    } catch (e) {
      if (g === gen.current) setError(errText(e));
    } finally {
      if (g === gen.current) setLoading(false);
    }
  };
  useEffect(() => { setItems([]); setPage(0); load(1, true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [params]);

  // Chargement automatique en approchant du bas
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !loading && page < pages) load(page + 1, false); }, { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  });

  // Boutiques du rayon ou du marché
  const shopsPath = kind === 'rayon' && arg ? `/shops?categoryId=${arg}&sort=popular&limit=8` : kind === 'marche' && arg ? `/shops?market=${encodeURIComponent(arg)}&sort=popular&limit=8` : kind === 'recherche' && q ? `/shops?q=${encodeURIComponent(q)}&limit=8` : null;
  const shops = useApi<{ items: ShopCard[] }>(shopsPath);

  const title = sel?.title ?? (kind === 'recherche' ? `« ${q} »` : kind === 'marche' ? arg ?? '' : cat?.name ?? 'Rayon');
  const markets = Object.keys(meta.data?.marketCounts ?? {}).sort();
  const active = (price ? 1 : 0) + (wholesale ? 1 : 0) + (inStock ? 1 : 0) + (market && kind !== 'marche' ? 1 : 0);

  return (
    <>
      <div className="crumbs"><a href="#/">Accueil</a><span>›</span>{cat?.parent ? <><a href={`#/rayon/${cat.parent.id}`}>{cat.parent.name}</a><span>›</span></> : null}<span>{kind === 'recherche' ? 'Recherche' : title}</span></div>
      <h1 className="page-title">{title}</h1>

      {kids.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          <a className={`chip green${parent && arg === parent.id ? ' on' : ''}`} href={`#/rayon/${parent!.id}`}>Tout</a>
          {kids.map((k) => <a key={k.id} className={`chip green${arg === k.id ? ' on' : ''}`} href={`#/rayon/${k.id}`}>{k.name}</a>)}
        </div>
      )}

      {shops.data && shops.data.items.length > 0 && (
        <section className="section" style={{ paddingTop: 14 }}>
          <div className="section-head"><h2 style={{ fontSize: 19 }}>{kind === 'marche' ? 'Boutiques du marché' : kind === 'recherche' ? 'Boutiques' : 'Boutiques du rayon'}</h2></div>
          <div className="shops">{shops.data.items.slice(0, 4).map((s) => <ShopTile key={s.id} s={s} />)}</div>
        </section>
      )}

      <div className="filters" style={{ marginTop: 16 }}>
        <div className="chips">
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier">{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          {!sel?.base.maxPrice && <select value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Prix">{PRICES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
          {kind !== 'marche' && markets.length > 0 && <select value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Marché"><option value="">Tous les marchés</option>{markets.map((m) => <option key={m} value={m}>{m}</option>)}</select>}
          {!sel?.base.wholesale && <button className={`chip${wholesale ? ' on' : ''}`} onClick={() => setWholesale(!wholesale)}>Prix de gros</button>}
          <button className={`chip${inStock ? ' on' : ''}`} onClick={() => setInStock(!inStock)}>Disponible</button>
          {active > 0 && <button className="chip" onClick={() => { setPrice(''); setWholesale(false); setInStock(false); if (kind !== 'marche') setMarket(''); }}>Effacer</button>}
        </div>
      </div>

      <div className="count">{page ? `${total} produit${total > 1 ? 's' : ''}` : ' '}</div>
      {error && !items.length ? <Empty icon="info" title="On revient dans un instant" text={error} action={<button className="btn" onClick={() => load(1, true)}>Réessayer</button>} />
        : !page && loading ? <GridSkeleton />
        : !items.length ? <Empty icon="search" title="Aucun produit" text={active ? 'Retirez des filtres pour voir plus de produits.' : kind === 'recherche' ? `Rien pour « ${q} ». Vérifiez l’orthographe ou essayez un autre mot.` : 'Les boutiques ajoutent leurs produits.'} />
        : <div className="grid">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      <div ref={sentinel} />
      {page > 0 && page < pages && <div style={{ textAlign: 'center', margin: '24px 0' }}><button className="btn gray" disabled={loading} onClick={() => load(page + 1, false)}>{loading ? 'Chargement…' : 'Voir plus'}</button></div>}
    </>
  );
}
