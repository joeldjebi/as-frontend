import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { api, Category, errText, photoUrl, uploadPhoto } from '../api';
import { formatMoney } from '../countries';
import { Badge, Card, Empty, Field, Icon, Modal, PageHeader, Search, Sheet, Switch, useToast } from '../ui';
import { MyProduct, MyShop, Variant } from './types';

const STATUS: Record<MyProduct['status'], [string, string]> = { ACTIVE: ['En ligne', 'green'], INACTIVE: ['Masqué', 'gray'], REMOVED: ['Retiré par l’équipe', 'red'] };

/** Catalogue de la boutique : ajout, modification, photos, options, stock, acompte */
export default function ShopProducts({ shop }: { shop: MyShop }) {
  const toast = useToast();
  const [rows, setRows] = useState<MyProduct[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<MyProduct | 'new' | null>(null);
  const load = useCallback(() => api<MyProduct[]>(`/products/mine?shopId=${shop.id}`).then(setRows).catch(() => setRows([])), [shop.id]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => { api<Category[]>('/categories').then(setCats).catch(() => {}); }, []);

  const toggle = async (p: MyProduct) => {
    try {
      await api(`/products/mine/${p.id}`, { method: 'PATCH', body: { active: p.status !== 'ACTIVE' } });
      toast(p.status === 'ACTIVE' ? 'Produit masqué' : 'Produit en ligne');
      load();
    } catch (e) {
      toast(errText(e));
    }
  };

  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = (rows ?? []).filter((p) => !q.trim() || fold(p.name).includes(fold(q.trim())));
  const catName = (id: string) => cats.flatMap((c) => [c, ...(c.children ?? [])]).find((c) => c.id === id)?.name ?? '';
  return (
    <>
      <PageHeader title="Produits" subtitle={rows ? `${rows.length} produit(s) · ${rows.filter((p) => p.status === 'ACTIVE').length} en ligne` : 'Chargement…'} actions={<button className="btn" onClick={() => setOpen('new')}><Icon name="plus" size={15} />Ajouter un produit</button>} />
      <div className="toolbar"><span className="spacer" /><Search value={q} onChange={setQ} placeholder="Rechercher un produit" /></div>
      <Card>
        {!rows ? <Empty icon="box">Chargement…</Empty> : list.length === 0 ? <Empty icon="box">{rows.length ? 'Aucun produit trouvé' : 'Ajoutez votre premier produit'}</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Produit</th><th>Rayon</th><th className="num">Prix</th><th className="num">Stock</th><th className="num">Vues</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => setOpen(p)}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {p.photos[0] ? <img src={`${photoUrl(p.photos[0])}?w=240`} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: 'cover' }} /> : <span style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--fill)' }} />}
                        <div>{p.name}{p.variants.length > 0 && <span className="sub">{p.variants.length} option(s)</span>}</div>
                      </div>
                    </td>
                    <td>{catName(p.categoryId)}</td>
                    <td className="num">{formatMoney(p.price)}{p.prepayPercent != null && p.prepayPercent < 100 && <span className="sub">acompte {p.prepayPercent} %</span>}</td>
                    <td className="num">{p.totalStock == null ? '—' : p.totalStock <= 0 ? <Badge color="orange">Épuisé</Badge> : p.totalStock}</td>
                    <td className="num">{p.views}</td>
                    <td><Badge color={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge>{p.moderationNote && <span className="sub">{p.moderationNote}</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>{p.status !== 'REMOVED' && <button className="btn secondary" onClick={() => toggle(p)}>{p.status === 'ACTIVE' ? 'Masquer' : 'Mettre en ligne'}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <ProductSheet shop={shop} cats={cats} product={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />}
    </>
  );
}

function ProductSheet({ shop, cats, product, onClose, onSaved }: { shop: MyShop; cats: Category[]; product: MyProduct | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const p = product;
  const [name, setName] = useState(p?.name ?? '');
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [photos, setPhotos] = useState<string[]>(p?.photos ?? []);
  const [price, setPrice] = useState(p?.price?.toString() ?? '');
  const [wholesale, setWholesale] = useState(p?.wholesalePrice?.toString() ?? '');
  const [minQty, setMinQty] = useState(p?.wholesaleMinQty?.toString() ?? '');
  const [track, setTrack] = useState(p ? (p.variants.length ? p.variants.some((v) => v.stock != null) : p.stock != null) : false);
  const [stock, setStock] = useState(p?.stock?.toString() ?? '');
  const [variants, setVariants] = useState<Variant[]>(p?.variants ?? []);
  const [prepay, setPrepay] = useState<string>(p?.prepayPercent == null ? 'shop' : String(p.prepayPercent));
  const [active, setActive] = useState(p ? p.status === 'ACTIVE' : true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const int = (s: string) => { const n = parseInt(s.replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null; };

  const addPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])].slice(0, 6 - photos.length);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadPhoto(f));
      setPhotos((ph) => [...ph, ...urls].slice(0, 6));
    } catch (err) {
      toast(errText(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return toast('Indiquez le nom du produit');
    if (!categoryId) return toast('Choisissez un rayon');
    if (!photos.length) return toast('Ajoutez au moins une photo');
    if (!int(price)) return toast('Indiquez le prix');
    const w = shop.type === 'GROSSISTE' ? int(wholesale) : null;
    const body = {
      name: name.trim(), categoryId, description: description.trim(), photos, price: int(price),
      wholesalePrice: w, wholesaleMinQty: w == null ? null : int(minQty),
      stock: track && !variants.length ? (int(stock) ?? 0) : null,
      variants: variants.filter((v) => v.label.trim()).map((v) => ({ ...(v.id ? { id: v.id } : {}), label: v.label.trim(), price: v.price, stock: track ? (v.stock ?? 0) : null })),
      prepayPercent: prepay === 'shop' ? null : Number(prepay),
      active,
    };
    setBusy(true);
    try {
      if (p) await api(`/products/mine/${p.id}`, { method: 'PATCH', body });
      else await api('/products', { method: 'POST', body: { ...body, shopId: shop.id } });
      toast(p ? 'Produit enregistré' : 'Produit ajouté');
      onSaved();
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const run = async (path: string, method: string, msg: string) => {
    try {
      await api(path, { method });
      toast(msg);
      onSaved();
    } catch (e) {
      toast(errText(e));
    }
  };

  const setVar = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, k) => (k === i ? { ...v, ...patch } : v)));
  return (
    <Sheet title={p ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose} actions={<button className="btn" disabled={busy || uploading} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>}>
      {p?.status === 'REMOVED' && <div className="alert"><strong>Retiré par l’équipe :</strong> {p.moderationNote}</div>}
      <div>
        <div className="section-title">Photos (6 maximum, la première est la principale)</div>
        <div className="pp-photos">
          {photos.map((u, i) => (
            <figure key={u}>
              <img src={`${photoUrl(u)}?w=240`} alt={`Photo ${i + 1}`} />
              <button type="button" className="pp-x" aria-label="Retirer la photo" onClick={() => setPhotos(photos.filter((x) => x !== u))}><Icon name="close" size={12} /></button>
              {i === 0 ? <span className="pp-main">Principale</span> : <button type="button" className="pp-set" onClick={() => setPhotos([u, ...photos.filter((x) => x !== u)])}>Mettre en premier</button>}
            </figure>
          ))}
          {photos.length < 6 && (
            <label className="pp-add">
              <Icon name="camera" size={18} />
              <span>{uploading ? 'Envoi…' : 'Ajouter'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={addPhotos} />
            </label>
          )}
        </div>
      </div>
      <div className="form-grid">
        <Field label="Nom du produit"><input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Pagne wax 6 yards" /></Field>
        <Field label="Rayon">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Choisir…</option>
            {cats.map((c) => (c.children?.length ? (
              <optgroup key={c.id} label={c.name}>{c.children.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</optgroup>
            ) : <option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </Field>
      </div>
      <Field label="Description"><textarea rows={4} value={description} maxLength={3000} onChange={(e) => setDescription(e.target.value)} placeholder="Matière, taille, état, conseils…" /></Field>
      <div className="form-grid">
        <Field label="Prix au détail (F)"><input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex. : 12500" /></Field>
        <Field label="Paiement avant livraison">
          <select value={prepay} onChange={(e) => setPrepay(e.target.value)}>
            <option value="shop">Comme la boutique ({shop.prepayPercent >= 100 ? 'totalité' : `acompte ${shop.prepayPercent} %`})</option>
            <option value="100">Totalité à la commande</option>
            {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((n) => <option key={n} value={n}>Acompte {n} %, le reste à la livraison</option>)}
          </select>
        </Field>
        {shop.type === 'GROSSISTE' && <>
          <Field label="Prix de gros (F)" hint="Visible seulement par les revendeurs validés"><input inputMode="numeric" value={wholesale} onChange={(e) => setWholesale(e.target.value)} placeholder="Facultatif" /></Field>
          <Field label="Quantité minimale pour le gros"><input inputMode="numeric" value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="Ex. : 10" disabled={!wholesale} /></Field>
        </>}
      </div>
      <div>
        <div className="section-title">Options (taille, couleur…)</div>
        {variants.map((v, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
            <input value={v.label} placeholder="Ex. : Taille M" onChange={(e) => setVar(i, { label: e.target.value })} />
            <input inputMode="numeric" value={v.price ?? ''} placeholder="Prix (si différent)" onChange={(e) => setVar(i, { price: int(e.target.value) })} />
            <input inputMode="numeric" value={v.stock ?? ''} placeholder="Stock" disabled={!track} onChange={(e) => setVar(i, { stock: int(e.target.value) })} />
            <button type="button" className="btn secondary icon-btn" aria-label="Retirer l’option" onClick={() => setVariants(variants.filter((_, k) => k !== i))}><Icon name="close" size={14} /></button>
          </div>
        ))}
        <button type="button" className="btn secondary" onClick={() => setVariants([...variants, { label: '', price: null, stock: null }])}><Icon name="plus" size={14} />Ajouter une option</button>
      </div>
      <div className="form-grid">
        <Field label="Stock"><div className="sw-row"><Switch checked={track} onChange={setTrack} label="Suivre le stock" /><span>Suivre le stock</span></div></Field>
        {track && !variants.length && <Field label="Quantité en stock"><input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" /></Field>}
      </div>
      <Field label="Visibilité"><div className="sw-row"><Switch checked={active} onChange={setActive} label="En ligne" /><span>{active ? 'En ligne : visible par les clients' : 'Masqué'}</span></div></Field>
      {p && (
        <div className="li-actions">
          <button className="btn secondary" onClick={() => run(`/products/mine/${p.id}/duplicate`, 'POST', 'Copie créée (masquée)')}>Dupliquer</button>
          <button className="btn secondary" onClick={() => setConfirmDelete(true)}>Supprimer</button>
          <small className="muted grow">La copie est créée masquée : modifiez-la puis mettez-la en ligne.</small>
        </div>
      )}
      {confirmDelete && p && (
        <Modal title="Supprimer ce produit ?" subtitle="Il disparaît de la boutique. Les commandes déjà passées ne changent pas." onClose={() => setConfirmDelete(false)}
          footer={<><button className="btn secondary" onClick={() => setConfirmDelete(false)}>Annuler</button><button className="btn" onClick={() => run(`/products/mine/${p.id}`, 'DELETE', 'Produit supprimé')}>Supprimer</button></>} />
      )}
    </Sheet>
  );
}
