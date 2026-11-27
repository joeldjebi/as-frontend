import { useEffect, useState } from 'react';
import { api, dateTime, errText, money, phoneFmt, session, thumb, toast, useApi, useStore } from '../core';
import { Empty, Icon } from '../ui';
import { deliveryLabel } from '../delivery';

interface Order {
  id: string; number: string; shopName: string; status: string; deliveryLabel: string | null; createdAt: string;
  items: { name: string; variantLabel: string | null; qty: number; price: number; subtotal: number; photo: string | null }[];
  goodsTotal: number; dueNow: number; dueOnDelivery: number; recipientName: string; recipientPhone: string; cancelReason: string | null;
  address: { label: string; address: string; landmark: string | null };
  payment: { mode: string; alias: string | null; payee: string; reference?: string | null; rejectedNote?: string | null };
  vehicleType?: string; speed?: string; vehicleName?: string | null;
  delivery: { status?: string; trackingUrl?: string | null; price?: number | null; confirmationCode?: string | null; error?: string | null; driver?: { name: string; phone?: string | null; plate?: string | null } | null };
}

export const STATUS: Record<string, [string, string]> = {
  AWAITING_PAYMENT: ['À payer', 'var(--accent)'], PAYMENT_DECLARED: ['Paiement en vérification', 'var(--primary)'], PAID: ['Payée · livreur demandé', 'var(--primary)'],
  IN_DELIVERY: ['En livraison', 'var(--primary)'], DELIVERED: ['Livrée', 'var(--ok)'], CANCELLED: ['Annulée', 'var(--muted)'], FAILED: ['Nouveau passage à prévoir', 'var(--muted)'],
};
const label = (o: Order) => (o.status === 'IN_DELIVERY' && o.deliveryLabel ? o.deliveryLabel : STATUS[o.status]?.[0] ?? o.status);

/** Mes commandes */
export function Orders() {
  const { token } = useStore(session);
  const { data, error, reload } = useApi<Order[]>(token ? '/orders/mine' : null);
  if (!token) return <Empty icon="user" title="Connectez-vous" text="Vos commandes apparaissent ici." action={<a className="btn" href="#/compte">Se connecter</a>} />;
  return (
    <>
      <h1 className="page-title">Mes commandes</h1>
      {error ? <Empty icon="info" title="On revient dans un instant" text={error} action={<button className="btn" onClick={reload}>Réessayer</button>} />
        : !data ? <div className="skel" style={{ height: 200, marginTop: 14 }} />
        : !data.length ? <Empty icon="bag" title="Aucune commande" text="Vos commandes et leur livraison apparaîtront ici." action={<a className="btn" href="#/">Découvrir</a>} />
        : (
          <div className="group on-bg" style={{ marginTop: 14 }}>
            {data.map((o) => (
              <a key={o.id} className="cell" href={`#/commande/${o.id}`}>
                {o.items[0]?.photo ? <img src={thumb(o.items[0].photo, 240)} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} /> : <span style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--fill)' }} />}
                <div className="grow"><b>{o.shopName}</b><small>{o.number} · {dateTime(o.createdAt)}</small><small style={{ color: STATUS[o.status]?.[1] }}>{label(o)}</small></div>
                <span className="val">{money(o.goodsTotal)}</span><Icon name="chevron" size={16} />
              </a>
            ))}
          </div>
        )}
    </>
  );
}

/** Une commande : payer, suivre la livraison */
export function OrderDetail({ id }: { id: string }) {
  const { token } = useStore(session);
  const [o, setO] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ref, setRef] = useState('');
  const [payer, setPayer] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api<Order>(`/orders/${id}`).then((x) => { setO(x); setErr(null); }).catch((e) => setErr(errText(e)));
  useEffect(() => {
    if (!token) return;
    load();
    const t = setInterval(() => { if (o && ['PAYMENT_DECLARED', 'PAID', 'IN_DELIVERY'].includes(o.status)) load(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, o?.status]);
  if (!token) return <Empty icon="user" title="Connectez-vous" action={<a className="btn" href="#/compte">Se connecter</a>} />;
  if (err && !o) return <Empty icon="info" title="Nous retrouvons votre commande" text={err} />;
  if (!o) return <div className="skel" style={{ height: 300, marginTop: 20 }} />;

  const declare = async () => {
    if (ref.trim().length < 4) return toast('Indiquez la référence reçue par SMS');
    const p = payer.replace(/\D/g, '');
    setBusy(true);
    try {
      setO(await api<Order>(`/orders/mine/${o.id}/payment`, { method: 'POST', body: { reference: ref.trim(), ...(p.length === 10 ? { payerPhone: p } : {}) } }));
      toast('Paiement envoyé pour vérification');
    } catch (e) { toast(errText(e)); } finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!confirm('Annuler cette commande ? Les articles seront remis en stock.')) return;
    try { setO(await api<Order>(`/orders/mine/${o.id}/cancel`, { method: 'POST' })); } catch (e) { toast(errText(e)); }
  };
  const step = { AWAITING_PAYMENT: 0, PAYMENT_DECLARED: 0, PAID: 1, IN_DELIVERY: 2, DELIVERED: 3 }[o.status] ?? -1;
  const d = o.delivery ?? {};

  return (
    <>
      <div className="crumbs"><a href="#/commandes">Mes commandes</a><span>›</span><span>{o.number}</span></div>
      <h1 className="page-title">{o.number}</h1>
      <div className="two">
        <div>
          <div className="panel">
            <div className="status" style={{ color: STATUS[o.status]?.[1], fontSize: 17 }}>{label(o)}</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{o.shopName} · {dateTime(o.createdAt)}</p>
            {step >= 0 && <div className="steps">{['Commandée', 'Payée', 'En route', 'Livrée'].map((s, i) => <div key={s} className={i <= step ? 'on' : ''}>{s}</div>)}</div>}
          </div>

          {o.status === 'AWAITING_PAYMENT' && (
            <>
              {o.payment.rejectedNote && <div className="banner orange"><Icon name="info" /><div><b>Paiement à confirmer</b><p>Nous n’avons pas encore retrouvé votre paiement ({o.payment.rejectedNote}). Vérifiez la référence puis renvoyez-la.</p></div></div>}
              <div className="gtitle">Payer par Mobile Money</div>
              <div className="group on-bg">
                <div className="cell"><div className="grow">Montant</div><b style={{ fontSize: 18 }}>{money(o.dueNow)}</b></div>
                <div className="cell"><div className="grow">Bénéficiaire</div><span className="val">{o.payment.payee}</span></div>
                {o.payment.alias && <div className="cell"><div className="grow">Alias PI-SPI</div><span className="val">{o.payment.alias}</span><button className="icon-btn" onClick={() => { navigator.clipboard?.writeText(o.payment.alias!); toast('Alias copié'); }} aria-label="Copier l’alias"><Icon name="copy" size={18} /></button></div>}
              </div>
              <p className="gfoot">Envoyez le montant depuis votre application Mobile Money (PI-SPI), puis indiquez la référence reçue par SMS.</p>
              <div className="gtitle">Votre paiement</div>
              <div className="group on-bg">
                <div className="field"><label htmlFor="rf">Référence</label><input id="rf" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reçue par SMS" /></div>
                <div className="field"><label htmlFor="py">Payé depuis</label><input id="py" inputMode="tel" value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Numéro (facultatif)" /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                <button className="btn" disabled={busy} onClick={declare}>{busy ? 'Un instant…' : 'J’ai payé'}</button>
                <button className="btn gray" onClick={cancel}>Annuler la commande</button>
              </div>
            </>
          )}
          {o.status === 'PAYMENT_DECLARED' && <div className="banner green"><Icon name="clock" /><div><b>Paiement en vérification</b><p>{o.payment.payee} vérifie la réception (réf. {o.payment.reference}). La livraison partira dès la confirmation.</p></div></div>}
          {o.status === 'PAID' && <div className="banner green"><Icon name="check" /><div><b>Paiement confirmé</b><p>Nous recherchons le meilleur livreur pour récupérer votre colis.</p></div></div>}
          {(o.status === 'IN_DELIVERY' || o.status === 'DELIVERED') && (
            <>
              {o.status === 'IN_DELIVERY' && d.status === 'PENDING' && <OffersPanel orderId={o.id} onAccepted={load} />}
              <div className="gtitle">Livraison VITE · {deliveryLabel(o.vehicleType, o.speed, o.vehicleName)}</div>
              <div className="group on-bg">
                <div className="cell"><span className="ico" style={{ background: 'var(--primary)' }}><Icon name="moto" size={17} /></span><div className="grow">{o.deliveryLabel ?? 'En livraison'}{!d.driver && <small>Un livreur va accepter la course</small>}</div></div>
                {d.driver && <div className="cell"><span className="ico" style={{ background: 'var(--teal)' }}><Icon name="user" size={17} /></span><div className="grow">{d.driver.name}<small>{d.driver.plate ?? ''}</small></div>{d.driver.phone && <a className="btn tinted sm" href={`tel:${d.driver.phone}`}>Appeler</a>}</div>}
                {d.trackingUrl && <a className="cell" href={d.trackingUrl} target="_blank" rel="noreferrer"><span className="ico" style={{ background: 'var(--accent)' }}><Icon name="map" size={17} /></span><div className="grow">Suivre sur la carte</div><Icon name="chevron" size={16} /></a>}
              </div>
              {d.confirmationCode && o.status === 'IN_DELIVERY' && <><div className="gtitle">Code de remise</div><div className="panel"><div className="code">{d.confirmationCode}</div><p className="muted" style={{ textAlign: 'center', fontSize: 13 }}>À donner au livreur à la remise du colis</p></div></>}
            </>
          )}
          {o.status === 'CANCELLED' && <div className="banner"><Icon name="close" /><div><b>Commande annulée</b><p>{o.cancelReason}</p></div></div>}
          {o.status === 'FAILED' && <div className="banner orange"><Icon name="info" /><div><b>Nouveau passage à prévoir</b><p>Le livreur n’a pas pu vous remettre le colis : la boutique vous contacte pour convenir d’un nouveau passage.</p></div></div>}

          <div className="gtitle">Articles</div>
          <div className="group on-bg">
            {o.items.map((i, k) => (
              <div className="item" key={k}>
                {i.photo ? <img src={thumb(i.photo, 240)} alt="" style={{ width: 56, height: 56 }} /> : <span className="ph" style={{ width: 56, height: 56 }} />}
                <div className="grow"><div className="t">{i.name}</div><div className="meta">{[i.variantLabel, `${i.qty} × ${money(i.price)}`].filter(Boolean).join(' · ')}</div></div>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(i.subtotal)}</b>
              </div>
            ))}
          </div>
        </div>
        <aside className="summary">
          <h3 style={{ fontSize: 19, marginBottom: 8 }}>Montants</h3>
          <div className="line"><span>Marchandise</span><span>{money(o.goodsTotal)}</span></div>
          <div className="line"><span>Payé à la commande</span><span>{money(o.dueNow)}</span></div>
          {o.dueOnDelivery > 0 && <div className="line"><span>Reste à la livraison</span><span>{money(o.dueOnDelivery)}</span></div>}
          {d.price != null && <div className="line"><span>Livraison</span><span>{money(d.price)}</span></div>}
          {(o.status === 'IN_DELIVERY') && <div className="line total"><span>Au livreur</span><span>{money(o.dueOnDelivery + (d.price ?? 0))}</span></div>}
          <h3 style={{ fontSize: 16, margin: '16px 0 6px' }}>Livré à</h3>
          <p>{o.recipientName}<br /><span className="muted">{phoneFmt(o.recipientPhone.startsWith('+') ? o.recipientPhone : `+225${o.recipientPhone}`)}</span><br /><span className="muted">{[o.address.address, o.address.landmark].filter(Boolean).join(' · ')}</span></p>
        </aside>
      </div>
    </>
  );
}

interface Offer {
  id: string; price: number; counterPrice: number | null; awaiting: 'CLIENT' | 'DRIVER'; minCounter: number; expiresAt: string;
  driver: { name: string }; etaMin: number | null;
}

/** Propositions des livreurs pendant la recherche : accepter, refuser ou faire son offre */
function OffersPanel({ orderId, onAccepted }: { orderId: string; onAccepted: () => void }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [counter, setCounter] = useState<{ id: string; value: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api<Offer[]>(`/orders/mine/${orderId}/offers`).then((r) => setOffers(r ?? [])).catch(() => {});
  useEffect(() => {
    load();
    const poll = setInterval(load, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const act = async (o: Offer, action: 'accept' | 'decline' | 'counter', price?: number) => {
    setBusy(o.id);
    try {
      await api(`/orders/mine/${orderId}/offers/${o.id}/${action}`, { method: 'POST', ...(price ? { body: { price } } : {}) });
      if (action === 'accept') { toast(`${o.driver.name} arrive pour ${money(o.price)}`); onAccepted(); }
      if (action === 'counter') toast(`Votre offre est envoyée à ${o.driver.name}`);
      setCounter(null);
    } catch (e) { toast(errText(e)); } finally { setBusy(null); load(); }
  };

  const live = offers.filter((o) => Date.parse(o.expiresAt) > now);
  if (!live.length) return null;
  return (
    <>
      <div className="gtitle">Propositions des livreurs</div>
      <div className="group on-bg">
        {live.map((o) => {
          const left = Math.max(0, Math.round((Date.parse(o.expiresAt) - now) / 1000));
          const max = o.price - 50;
          const open = counter?.id === o.id;
          return (
            <div key={o.id} style={{ padding: '12px 16px', borderBottom: '.5px solid var(--sep)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ico" style={{ background: 'var(--primary)' }}><Icon name="moto" size={17} /></span>
                <div className="grow"><b>{o.driver.name}</b><small className="muted" style={{ display: 'block' }}>{[o.etaMin ? `à ~${o.etaMin} min de la boutique` : null, `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} pour répondre`].filter(Boolean).join(' · ')}</small></div>
                <b style={{ fontSize: 18 }}>{money(o.price)}</b>
              </div>
              {o.counterPrice != null ? (
                <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>Votre offre : <b>{money(o.counterPrice)}</b> · en attente de la réponse du livreur</p>
              ) : open ? (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input inputMode="numeric" value={counter!.value} onChange={(e) => setCounter({ id: o.id, value: e.target.value })} style={{ flex: '1 1 120px', height: 40, borderRadius: 10, border: '1px solid var(--line)', padding: '0 12px', background: 'var(--card)', color: 'var(--ink)' }} aria-label="Votre prix" />
                  <button className="btn sm" disabled={busy === o.id} onClick={() => act(o, 'counter', Number(counter!.value.replace(/\D/g, '')))}>Envoyer</button>
                  <button className="btn gray sm" onClick={() => setCounter(null)}>Annuler</button>
                  <small className="muted" style={{ flexBasis: '100%' }}>Entre {money(o.minCounter)} et {money(max)}</small>
                </div>
              ) : null}
              {!open && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="btn gray sm" disabled={busy === o.id} onClick={() => act(o, 'decline')}>Refuser</button>
                  {o.counterPrice == null && max >= o.minCounter && <button className="btn tinted sm" onClick={() => setCounter({ id: o.id, value: String(Math.round((o.minCounter + max) / 100) * 50) })}>Faire une offre</button>}
                  <button className="btn sm" disabled={busy === o.id} onClick={() => act(o, 'accept')}>Accepter {money(o.price)}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="gfoot">Un livreur propose un autre prix que l’estimation. Acceptez, refusez ou faites votre offre : la course reste proposée aux autres livreurs.</p>
    </>
  );
}
