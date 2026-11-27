import { useEffect, useState } from 'react';
import { money, session, thumb, useApi, useStore } from '../core';
import { catIcon, GridSkeleton, Icon, Product, ProductCard, ShopCard, ShopTile, TINTS } from '../ui';

export interface Category { id: string; name: string; icon: string | null; parentId: string | null; children?: Category[] }
interface HomeData {
  newProducts: Product[]; popularProducts: Product[]; cheapProducts: Product[]; wholesaleProducts: Product[];
  featuredShops: ShopCard[]; newShops: ShopCard[]; markets: { name: string; shops: number }[];
  categoryCounts: Record<string, number>; totals: { products: number; shops: number };
}

/** Accueil de la boutique en ligne */
export default function Home() {
  const { user } = useStore(session);
  const home = useApi<HomeData>('/products/home');
  const cats = useApi<Category[]>('/categories');
  const h = home.data;
  const hour = new Date().getHours();
  useReveal();
  return (
    <>
      <Hero h={h} greeting={user ? `${hour < 5 || hour >= 18 ? 'Bonsoir' : 'Bonjour'} ${user.name.split(' ')[0]}` : null} />

      {cats.data && cats.data.length > 0 && (
        <section className="section reveal">
          <div className="section-head"><h2>Rayons</h2><a href="#/rayons">Tout voir</a></div>
          <div className="depts">
            {cats.data.map((c, i) => (
              <a key={c.id} className="dept" href={`#/rayon/${c.id}`}>
                <span className="ic" style={{ background: `${TINTS[i % TINTS.length]}1F`, color: TINTS[i % TINTS.length] }}><Icon name={catIcon(c.icon)} size={22} /></span>
                <span>{c.name.split(' et ')[0]}</span>
                {h?.categoryCounts[c.id] ? <small>{h.categoryCounts[c.id]} produit{h.categoryCounts[c.id] > 1 ? 's' : ''}</small> : null}
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="section reveal">
        <div className="section-head"><h2>Sélections</h2></div>
        <div className="bento">
          <a className="tile big photo" href="#/selection/new" style={{ background: 'var(--fill)' }}>
            {h?.newProducts[0]?.photos[0] && <img src={thumb(h.newProducts[0].photos[0], 800)} alt="" />}
            <div className="glass-label"><h3>Nouveautés</h3><p>{h ? `${h.newProducts.length} ajoutés récemment` : 'Les derniers produits'}</p></div>
          </a>
          <a className="tile wax accent" href="#/selection/cheap"><h3>Petits prix</h3><p>Jusqu’à 5 000 F</p></a>
          <a className="tile wax teal" href="#/selection/wholesale"><h3>Vente en gros</h3><p>Prix revendeurs</p></a>
          <a className="tile wax" href="#/selection/popular"><h3>Les plus vus</h3><p>Ce que tout le monde regarde</p></a>
          <a className="tile" href="#/boutiques" style={{ background: 'var(--bg2)' }}><h3>Boutiques</h3><p className="muted">Par marché, boutique ou grossiste</p></a>
        </div>
      </section>

      <section className="section reveal">
        <div className="section-head"><h2>Nouveautés</h2><a href="#/selection/new">Tout voir</a></div>
        {!h ? <GridSkeleton n={5} /> : <div className="rail">{h.newProducts.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>

      {h && h.featuredShops.length > 0 && (
        <section className="section reveal">
          <div className="section-head"><h2>Boutiques à la une</h2><a href="#/boutiques">Toutes les boutiques</a></div>
          <div className="shops">{h.featuredShops.map((s) => <ShopTile key={s.id} s={s} />)}</div>
        </section>
      )}

      {h && h.markets.length > 0 && (
        <section className="section reveal">
          <div className="section-head"><h2>Les marchés d’Adjamé</h2></div>
          <div className="markets">
            {h.markets.map((m, i) => (
              <a key={m.name} className={`market wax${i % 3 === 1 ? ' accent' : i % 3 === 2 ? ' teal' : ''}`} href={`#/marche/${encodeURIComponent(m.name)}`}>
                <b>{m.name}</b><span>{m.shops} boutique{m.shops > 1 ? 's' : ''}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {h && h.cheapProducts.length > 0 && (
        <section className="section reveal">
          <div className="section-head"><h2>Petits prix</h2><a href="#/selection/cheap">Tout voir</a></div>
          <div className="rail">{h.cheapProducts.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {h && h.popularProducts.length > 0 && (
        <section className="section reveal">
          <div className="section-head"><h2>Les plus vus</h2><a href="#/selection/popular">Tout voir</a></div>
          <div className="grid">{h.popularProducts.slice(0, 10).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="section reveal">
        <div className="group on-bg" style={{ marginTop: 10 }}>
          <div className="cell"><span className="ico" style={{ background: 'var(--primary)' }}><Icon name="moto" size={17} /></span><div className="grow">Livré par VITE<small>Une course par boutique, frais payés au livreur</small></div></div>
          <div className="cell"><span className="ico" style={{ background: 'var(--accent)' }}><Icon name="card" size={17} /></span><div className="grow">Paiement Mobile Money<small>Le colis vous est remis une fois le paiement confirmé</small></div></div>
          <div className="cell"><span className="ico" style={{ background: 'var(--teal)' }}><Icon name="shield" size={17} /></span><div className="grow">Boutiques vérifiées<small>Chaque vendeur est contrôlé par notre équipe</small></div></div>
        </div>
      </section>
    </>
  );
}

/** Fait apparaître les sections en douceur quand elles entrent à l'écran (y compris celles chargées plus tard) */
function useReveal() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    const scan = () => document.querySelectorAll('.reveal:not(.in)').forEach((e) => io.observe(e));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}

/** Héros : promesse, actions, chiffres, et vitrine vivante des derniers produits */
function Hero({ h, greeting }: { h: HomeData | null | undefined; greeting: string | null }) {
  const picks = (h ? [...h.newProducts, ...h.popularProducts] : []).filter((p, i, a) => p.photos[0] && a.findIndex((x) => x.id === p.id) === i).slice(0, 8);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (picks.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % picks.length), 3200);
    return () => clearInterval(t);
  }, [picks.length]);
  const card = (k: number) => picks.length ? picks[(i + k) % picks.length] : null;
  const live = card(0);
  return (
    <section className="hero2 wax">
      <div className="hero2-text">
        <span className="eyebrow">{greeting ?? 'Le marché d’Adjamé en ligne'}</span>
        <h1>Tout Adjamé,<br />livré chez vous.</h1>
        <p>Des centaines de boutiques vérifiées, payées par Mobile Money et livrées par VITE partout à Abidjan.</p>
        <div className="hero2-cta">
          <a className="btn light" href="#/rayons">Découvrir les rayons</a>
          <a className="btn ghost" href="#/boutiques">Voir les boutiques</a>
        </div>
        <div className="hero2-stats">
          <div><b>{h?.totals.shops ?? '–'}</b><span>boutiques</span></div>
          <div><b>{h?.totals.products ?? '–'}</b><span>produits</span></div>
          <div><b>{h?.markets.length ?? '–'}</b><span>marchés</span></div>
        </div>
      </div>
      <div className="hero2-show" aria-hidden="true">
        {[2, 1, 0].map((k) => {
          const p = card(k);
          return (
            <a key={k} className={`float f${k}`} href={p ? `#/produit/${p.id}` : '#/'} tabIndex={-1}>
              {p ? <img key={p.id} src={thumb(p.photos[0], 480)} alt="" /> : <span className="ph" />}
            </a>
          );
        })}
        {live && (
          <div className="live" key={live.id}>
            <span className="dot" />
            <div><b>{live.name}</b><small>{[live.shop?.name, money(live.price)].filter(Boolean).join(' · ')}</small></div>
          </div>
        )}
      </div>
    </section>
  );
}
