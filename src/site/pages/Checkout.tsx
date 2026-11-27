import { useEffect, useState } from 'react';
import { api, cart, errText, go, money, refreshMe, session, toast, useStore } from '../core';
import MapPicker from '../MapPicker';
import { Empty, Icon, Modal } from '../ui';

interface Quote {
  shops: { shopId: string; shopName: string; goodsTotal: number; dueNow: number; dueOnDelivery: number; deliveryFeeEstimate: number | null; payment: { mode: string; payee: string } }[];
  goodsTotal: number; dueNow: number; dueOnDelivery: number; deliveryFeeEstimate: number | null;
}

/** Finaliser : adresse (carte), destinataire, récapitulatif par boutique, confirmation */
export default function Checkout() {
  const { user, token } = useStore(session);
  const items = useStore(cart);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState((user?.phone ?? '').replace('+225', ''));
  const [note, setNote] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
  const addresses = user?.addresses ?? [];

  useEffect(() => { if (user) { setName((n) => n || user.name); setPhone((p) => p || user.phone.replace('+225', '')); setAddressId((a) => a ?? user.addresses[0]?.id ?? null); } }, [user]);
  useEffect(() => {
    if (!token || !items.length) return;
    setQuoteErr(null);
    api<Quote>('/orders/quote', { method: 'POST', body: { items: lines, ...(addressId ? { addressId } : {}) } }).then(setQuote).catch((e) => setQuoteErr(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, addressId, items]);

  if (!token) return <Empty icon="user" title="Connectez-vous" text="La commande se fait avec votre compte Adjamé-Smart." action={<a className="btn" href="#/panier">Retour au panier</a>} />;
  if (!items.length) return <Empty icon="bag" title="Votre panier est vide" action={<a className="btn" href="#/">Découvrir</a>} />;

  const confirm = async () => {
    if (!addressId) return toast('Ajoutez une adresse de livraison');
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) return toast('Téléphone du destinataire : 10 chiffres');
    setBusy(true);
    try {
      const r = await api<{ orders: { id: string }[] }>('/orders', { method: 'POST', body: { items: lines, addressId, recipientName: name.trim(), recipientPhone: digits, ...(note.trim() ? { note: note.trim() } : {}) } });
      cart.set([]);
      toast('Commande enregistrée');
      go(r.orders.length === 1 ? `/commande/${r.orders[0].id}` : '/commandes');
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const fee = quote?.deliveryFeeEstimate;
  return (
    <>
      <div className="crumbs"><a href="#/panier">Panier</a><span>›</span><span>Commande</span></div>
      <h1 className="page-title">Commande</h1>
      <div className="two">
        <div>
          <div className="gtitle">Adresse de livraison</div>
          <div className="group on-bg">
            {addresses.map((a) => (
              <button key={a.id} className="cell" onClick={() => setAddressId(a.id)}>
                <span className={`radio${addressId === a.id ? ' on' : ''}`} />
                <div className="grow">{a.label}<small>{[a.address, a.landmark].filter(Boolean).join(' · ')}</small></div>
              </button>
            ))}
            <button className="cell" onClick={() => setAdding(true)} style={{ color: 'var(--primary)' }}><Icon name="plus" /><div className="grow">Ajouter une adresse</div></button>
          </div>

          <div className="gtitle">Destinataire</div>
          <div className="group on-bg">
            <div className="field"><label htmlFor="rn">Nom</label><input id="rn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom et prénom" /></div>
            <div className="field"><label htmlFor="rp">Téléphone</label><span className="muted">+225</span><input id="rp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 01 02 03 04" /></div>
            <div className="field"><label htmlFor="nt">Note</label><input id="nt" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pour le livreur (facultatif)" /></div>
          </div>

          {quoteErr && <div className="banner orange"><Icon name="info" /><div><b>Panier à vérifier</b><p>{quoteErr}</p></div></div>}
          {quote?.shops.map((s) => (
            <div key={s.shopId}>
              <div className="gtitle">{s.shopName}</div>
              <div className="group on-bg">
                <div className="cell"><div className="grow">Articles</div><span className="val">{money(s.goodsTotal)}</span></div>
                <div className="cell"><div className="grow">À payer à la commande</div><b>{money(s.dueNow)}</b></div>
                {s.dueOnDelivery > 0 && <div className="cell"><div className="grow">Reste à la livraison</div><span className="val">{money(s.dueOnDelivery)}</span></div>}
                <div className="cell"><div className="grow">Livraison VITE</div><span className="val">{s.deliveryFeeEstimate == null ? 'Au livreur' : `≈ ${money(s.deliveryFeeEstimate)}`}</span></div>
                <div className="cell"><div className="grow">Paiement reçu par</div><span className="val">{s.payment.payee}</span></div>
              </div>
            </div>
          ))}
          <p className="gfoot">Après la commande, payez par Mobile Money et indiquez la référence reçue par SMS. Dès que le paiement est confirmé, un livreur VITE est envoyé à la boutique.</p>
        </div>
        <aside className="summary">
          <h3 style={{ fontSize: 19, marginBottom: 8 }}>Total</h3>
          <div className="line"><span>Marchandise</span><span>{quote ? money(quote.goodsTotal) : '…'}</span></div>
          <div className="line"><span>À la livraison</span><span className="muted">{quote ? money(quote.dueOnDelivery + (fee ?? 0)) : '…'}</span></div>
          {fee != null && <div className="line" style={{ fontSize: 13 }}><span className="muted">dont livraison estimée</span><span className="muted">≈ {money(fee)}</span></div>}
          <div className="line total"><span>À payer maintenant</span><span>{quote ? money(quote.dueNow) : '…'}</span></div>
          <button className="btn block" style={{ marginTop: 14 }} disabled={busy || !quote || !addressId} onClick={confirm}>{busy ? 'Un instant…' : 'Confirmer la commande'}</button>
          {!addressId && <p className="gfoot" style={{ margin: '10px 0 0' }}>Ajoutez une adresse de livraison pour continuer.</p>}
        </aside>
      </div>
      {adding && <AddressModal onClose={() => setAdding(false)} onSaved={(id) => { setAdding(false); setAddressId(id); }} />}
    </>
  );
}

/** Nouvelle adresse : point placé sur la carte (ou position actuelle) */
export function AddressModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const [label, setLabel] = useState('Maison');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const locate = () => {
    if (!navigator.geolocation) return setErr('Position indisponible sur cet appareil : placez le point sur la carte.');
    navigator.geolocation.getCurrentPosition((p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setErr('Position refusée : placez le point sur la carte.'), { enableHighAccuracy: true, timeout: 10000 });
  };
  const save = async () => {
    if (!address.trim()) return setErr('Indiquez la commune et le quartier');
    if (!pos) return setErr('Placez le point de livraison sur la carte');
    setBusy(true);
    setErr('');
    try {
      const before = new Set((session.get().user?.addresses ?? []).map((a) => a.id));
      const u = await api<{ addresses: { id: string }[] }>('/auth/me/addresses', { method: 'POST', body: { label: label.trim() || 'Adresse', address: address.trim(), landmark: landmark.trim(), lat: pos.lat, lng: pos.lng } });
      await refreshMe();
      const id = u.addresses.find((a) => !before.has(a.id))?.id ?? u.addresses[u.addresses.length - 1]?.id;
      if (id) onSaved(id);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal onClose={onClose} wide>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <button className="btn link" onClick={onClose}>Annuler</button>
        <b style={{ flex: 1, textAlign: 'center', fontSize: 17 }}>Nouvelle adresse</b>
        <button className="btn link" style={{ fontWeight: 600 }} disabled={busy} onClick={save}>Ajouter</button>
      </div>
      <div className="group">
        <div className="field"><label htmlFor="al">Nom</label><input id="al" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Maison, Bureau…" /></div>
        <div className="field"><label htmlFor="aa">Quartier</label><input id="aa" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Commune, quartier" /></div>
        <div className="field"><label htmlFor="am">Repère</label><input id="am" value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Facultatif (ex. près de la pharmacie)" /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', margin: '16px 4px 8px' }}>
        <b style={{ flex: 1 }}>Point de livraison</b>
        <button className="btn tinted sm" onClick={locate}><Icon name="pin" size={16} />Ma position</button>
      </div>
      <MapPicker value={pos} onChange={setPos} />
      <p className="gfoot">Touchez la carte à l’endroit exact de la livraison : le livreur s’y rendra.</p>
      {err && <div className="banner orange"><Icon name="info" /><p>{err}</p></div>}
    </Modal>
  );
}
