import { cart, cartTotals, go, lineNow, money, requireAuth, setQty, thumb, useStore } from '../core';
import { Empty, Icon, Stepper } from '../ui';

/** Panier : articles groupés par boutique (une livraison VITE par boutique) */
export default function Cart() {
  const items = useStore(cart);
  const t = cartTotals(items);
  if (!items.length) return <Empty icon="bag" title="Votre panier est vide" text="Parcourez les boutiques d’Adjamé et ajoutez vos coups de cœur." action={<a className="btn" href="#/">Découvrir</a>} />;
  const groups = Object.values(items.reduce<Record<string, typeof items>>((g, i) => ({ ...g, [i.shopId]: [...(g[i.shopId] ?? []), i] }), {}));
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 className="page-title">Panier</h1>
        <button className="btn link" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm('Vider le panier ?')) cart.set([]); }}>Vider</button>
      </div>
      <p className="muted">{t.count} article{t.count > 1 ? 's' : ''} · {groups.length} boutique{groups.length > 1 ? 's' : ''}</p>
      <div className="two">
        <div>
          {groups.map((g) => (
            <div key={g[0].shopId}>
              <div className="gtitle">{g[0].shopName}</div>
              <div className="group on-bg">
                {g.map((i) => (
                  <div className="item" key={`${i.productId}:${i.variantId}`}>
                    <a href={`#/produit/${i.productId}`}>{i.photo ? <img src={thumb(i.photo, 240)} alt="" /> : <span className="ph" />}</a>
                    <div className="grow">
                      <a className="t" href={`#/produit/${i.productId}`}>{i.name}</a>
                      {i.variantLabel && <div className="meta">{i.variantLabel}</div>}
                      {i.prepayPercent < 100 && <div className="prepay">Acompte {i.prepayPercent} % · {money(lineNow(i))} maintenant</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(i.price * i.qty)}</b>
                        <span style={{ marginLeft: 'auto' }}><Stepper sm min={0} value={i.qty} onChange={(n) => setQty(i, n)} /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="gfoot">{groups.length > 1 ? `Une livraison VITE par boutique (${groups.length}). Les frais sont payés en espèces à chaque livreur.` : 'Les frais de livraison VITE sont payés en espèces au livreur.'}</p>
        </div>
        <aside className="summary">
          <h3 style={{ fontSize: 19, marginBottom: 8 }}>Récapitulatif</h3>
          <div className="line"><span>Articles</span><span>{money(t.total)}</span></div>
          <div className="line"><span>À payer à la commande</span><b>{money(t.now)}</b></div>
          {t.later > 0 && <div className="line"><span className="muted">Reste à la livraison</span><span className="muted">{money(t.later)}</span></div>}
          <div className="line"><span className="muted">Livraison</span><span className="muted">Au livreur</span></div>
          <div className="line total"><span>Maintenant</span><span>{money(t.now)}</span></div>
          <button className="btn block" style={{ marginTop: 14 }} onClick={() => requireAuth('Connectez-vous pour finaliser votre commande', () => go('/commande'))}>Commander</button>
          <p className="gfoot" style={{ margin: '10px 0 0', display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="shield" size={15} />Paiement Mobile Money, colis remis une fois le paiement confirmé</p>
        </aside>
      </div>
    </>
  );
}
