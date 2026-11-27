import { useState } from 'react';
import { addToCart, go, money, requireAuth, thumb, toast, useApi } from '../core';
import { Empty, Icon, Product, Stepper } from '../ui';

/** Fiche produit : galerie, options, quantité, acompte, boutique */
export default function ProductPage({ id }: { id: string }) {
  const { data: p, error, loading, reload } = useApi<Product>(`/products/${id}`);
  const [photo, setPhoto] = useState(0);
  const [variant, setVariant] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  if (loading && !p) return <div className="product"><div className="skel" style={{ aspectRatio: '4 / 5', borderRadius: 28 }} /><div><div className="skel" style={{ height: 30, width: '70%' }} /><div className="skel" style={{ height: 24, width: '30%', marginTop: 16 }} /></div></div>;
  if (error || !p) return <Empty icon="info" title="Produit indisponible" text={error ?? undefined} action={<button className="btn" onClick={reload}>Réessayer</button>} />;

  const v = p.variants.find((x) => x.id === variant);
  const price = v?.price ?? p.price;
  const stock = v ? v.stock : p.stock;
  const out = stock != null && stock <= 0;
  const now = p.prepayPercent >= 100 ? price * qty : Math.round((price * qty * p.prepayPercent) / 100);

  const add = (andGo = false) => {
    if (p.variants.length && !v) return toast('Choisissez d’abord une option');
    if (!p.shop) return;
    addToCart({ productId: p.id, variantId: v?.id ?? null, name: p.name, variantLabel: v?.label ?? null, photo: p.photos[0] ?? null, price, shopId: p.shop.id, shopName: p.shop.name, qty, prepayPercent: p.prepayPercent ?? 100 });
    if (andGo) go('/panier'); else toast('Ajouté au panier');
  };

  return (
    <>
      <div className="crumbs"><a href="#/">Accueil</a><span>›</span>{p.shop && <><a href={`#/boutique/${p.shop.slug}`}>{p.shop.name}</a><span>›</span></>}<span>{p.name}</span></div>
      <div className="product">
        <div className="gallery">
          <div className="main">{p.photos[photo] && <img src={thumb(p.photos[photo], 1200)} alt={p.name} />}</div>
          {p.photos.length > 1 && (
            <div className="thumbs">
              {p.photos.map((u, i) => <button key={u} className={i === photo ? 'on' : ''} onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}><img src={thumb(u, 240)} alt="" /></button>)}
            </div>
          )}
        </div>
        <div className="pinfo">
          {p.shop && <a className="shopname" href={`#/boutique/${p.shop.slug}`}>{p.shop.name}</a>}
          <h1>{p.name}</h1>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="bigprice">{money(price)}</span>
            <span className="status" style={{ color: out ? 'var(--warn)' : 'var(--ok)' }}>{out ? 'Épuisé' : stock == null ? 'Disponible' : stock <= 5 ? `Plus que ${stock}` : 'En stock'}</span>
          </div>
          {p.hasWholesale && (
            <div className="banner green">
              <Icon name="box" />
              <div>{p.wholesalePrice != null ? <><b>Prix de gros : {money(p.wholesalePrice)}</b><p>À partir de {p.wholesaleMinQty} pièces</p></> : <><b>Prix de gros réservé aux revendeurs</b><p>Demandez le statut revendeur dans l’app Adjamé-Smart.</p></>}</div>
            </div>
          )}
          {p.variants.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <b>{v ? `Option : ${v.label}` : 'Choisissez une option'}</b>
              <div className="options">
                {p.variants.map((x) => <button key={x.id} className={`opt${variant === x.id ? ' on' : ''}`} disabled={x.stock != null && x.stock <= 0} onClick={() => setVariant(variant === x.id ? null : x.id)}>{x.label}</button>)}
              </div>
            </div>
          )}
          <div className="buy">
            <Stepper value={qty} onChange={setQty} />
            <button className="btn" style={{ flex: 1 }} disabled={out || !p.shop} onClick={() => add()}>{out ? 'Épuisé' : `Ajouter · ${money(price * qty)}`}</button>
          </div>
          <button className="btn tinted block" style={{ marginTop: 10 }} disabled={out || !p.shop} onClick={() => requireAuth('Connectez-vous pour commander', () => add(true))}>Acheter maintenant</button>

          <div className="group on-bg" style={{ marginTop: 22 }}>
            <div className="cell"><span className="ico" style={{ background: 'var(--accent)' }}><Icon name="card" size={17} /></span><div className="grow">{p.prepayPercent >= 100 ? 'Payé en entier à la commande' : `Acompte de ${p.prepayPercent} % à la commande`}<small>{p.prepayPercent >= 100 ? 'Mobile Money ; colis remis une fois le paiement confirmé' : `${money(now)} en Mobile Money, ${money(price * qty - now)} à la livraison`}</small></div></div>
            <div className="cell"><span className="ico" style={{ background: 'var(--primary)' }}><Icon name="moto" size={17} /></span><div className="grow">Livré par VITE<small>Frais de livraison payés en espèces au livreur</small></div></div>
            {p.shop && <a className="cell" href={`#/boutique/${p.shop.slug}`}>{p.shop.logoUrl ? <img src={thumb(p.shop.logoUrl, 240)} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} /> : <span className="ico" style={{ background: 'var(--teal)' }}><Icon name="store" size={17} /></span>}<div className="grow">{p.shop.name}<small>{[p.shop.type === 'GROSSISTE' ? 'Grossiste' : 'Boutique', p.shop.market].filter(Boolean).join(' · ')}</small></div><Icon name="chevron" size={16} /></a>}
          </div>
          {p.description && <><h3 style={{ marginTop: 26, fontSize: 19 }}>Description</h3><p style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: 'var(--ink2)' }}>{p.description}</p></>}
        </div>
      </div>
    </>
  );
}
