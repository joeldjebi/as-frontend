import { session, thumb, useApi, useStore } from '../core';
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
  return (
    <>
      <section className="hero wax">
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', opacity: 0.85 }}>{user ? `${hour < 5 || hour >= 18 ? 'BONSOIR' : 'BONJOUR'} ${user.name.split(' ')[0].toUpperCase()}` : 'LE MARCHÉ D’ADJAMÉ EN LIGNE'}</div>
          <h1 style={{ marginTop: 8 }}>Toutes les boutiques d’Adjamé, livrées chez vous.</h1>
          <p>Payez par Mobile Money, en entier ou avec un acompte selon la boutique. Un livreur VITE vous apporte la commande.</p>
        </div>
        <div className="stats">
          <div className="stat"><b>{h?.totals.shops ?? '–'}</b><span>boutiques</span></div>
          <div className="stat"><b>{h?.totals.products ?? '–'}</b><span>produits</span></div>
        </div>
      </section>

      {cats.data && cats.data.length > 0 && (
        <section className="section">
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

      <section className="section">
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

      <section className="section">
        <div className="section-head"><h2>Nouveautés</h2><a href="#/selection/new">Tout voir</a></div>
        {!h ? <GridSkeleton n={5} /> : <div className="rail">{h.newProducts.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>

      {h && h.featuredShops.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Boutiques à la une</h2><a href="#/boutiques">Toutes les boutiques</a></div>
          <div className="shops">{h.featuredShops.map((s) => <ShopTile key={s.id} s={s} />)}</div>
        </section>
      )}

      {h && h.markets.length > 0 && (
        <section className="section">
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
        <section className="section">
          <div className="section-head"><h2>Petits prix</h2><a href="#/selection/cheap">Tout voir</a></div>
          <div className="rail">{h.cheapProducts.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {h && h.popularProducts.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>Les plus vus</h2><a href="#/selection/popular">Tout voir</a></div>
          <div className="grid">{h.popularProducts.slice(0, 10).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="section">
        <div className="group on-bg" style={{ marginTop: 10 }}>
          <div className="cell"><span className="ico" style={{ background: 'var(--primary)' }}><Icon name="moto" size={17} /></span><div className="grow">Livré par VITE<small>Une course par boutique, frais payés au livreur</small></div></div>
          <div className="cell"><span className="ico" style={{ background: 'var(--accent)' }}><Icon name="card" size={17} /></span><div className="grow">Paiement Mobile Money<small>Le colis vous est remis une fois le paiement confirmé</small></div></div>
          <div className="cell"><span className="ico" style={{ background: 'var(--teal)' }}><Icon name="shield" size={17} /></span><div className="grow">Boutiques vérifiées<small>Chaque vendeur est contrôlé par notre équipe</small></div></div>
        </div>
      </section>
    </>
  );
}
