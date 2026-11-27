import { useCallback, useEffect, useState } from 'react';
import { api, dateTime, errText } from '../api';
import { formatMoney } from '../countries';
import { useOrdersRefresh } from '../live';
import { Order, ORDER_STATUS, useOpenFromHash } from '../pages/Orders';
import { Badge, Card, Empty, Field, Modal, PageHeader, Segmented, Sheet, useToast } from '../ui';
import { MyShop } from './types';

type Tab = 'todo' | 'delivery' | 'done';
const inTab = (o: Order, t: Tab) => t === 'todo' ? ['AWAITING_PAYMENT', 'PAYMENT_DECLARED', 'PAID'].includes(o.status) : t === 'delivery' ? o.status === 'IN_DELIVERY' : ['DELIVERED', 'CANCELLED', 'FAILED'].includes(o.status);

/** Commandes de la boutique : confirmer le paiement reçu (la course VITE part), refuser, annuler, relancer */
export default function ShopOrders({ shop }: { shop: MyShop }) {
  const [tab, setTab] = useState<Tab>('todo');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<Order | null>(null);
  const load = useCallback(() => api<Order[]>(`/orders/shop?shopId=${shop.id}`).then((list) => {
    setOrders(list);
    // La fiche ouverte suit les changements en direct
    setOpen((cur) => (cur ? list.find((x) => x.id === cur.id) ?? cur : cur));
  }).catch(() => setOrders((cur) => cur ?? [])), [shop.id]);
  useEffect(() => {
    setOrders(null);
    if (shop.status !== 'APPROVED') { setOrders([]); return; }
    load();
    // Filet de sécurité : les changements arrivent en temps réel
    const t = window.setInterval(load, 60_000);
    return () => window.clearInterval(t);
  }, [load, shop.status]);
  useOrdersRefresh(() => { if (shop.status === 'APPROVED') load(); });
  useOpenFromHash(orders, setOpen);

  const all = orders ?? [];
  const count = (t: Tab) => all.filter((o) => inTab(o, t)).length;
  const toConfirm = all.filter((o) => o.status === 'PAYMENT_DECLARED' && o.payment.mode === 'DIRECT').length;
  const rows = all.filter((o) => inTab(o, tab));
  return (
    <>
      <PageHeader title="Commandes" subtitle={toConfirm ? `${toConfirm} paiement(s) à confirmer` : 'Confirmez les paiements reçus : la livraison VITE part aussitôt.'} />
      <div className="toolbar">
        <Segmented<Tab> value={tab} onChange={setTab} options={[['todo', `À traiter (${count('todo')})`], ['delivery', `En livraison (${count('delivery')})`], ['done', `Terminées (${count('done')})`]]} />
      </div>
      <Card>
        {!orders ? <Empty icon="receipt">Chargement…</Empty> : rows.length === 0 ? <Empty icon="receipt">{shop.status !== 'APPROVED' ? 'Les commandes arrivent une fois la boutique en ligne.' : 'Aucune commande ici'}</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Commande</th><th>Articles</th><th>Client</th><th className="num">Acompte</th><th className="num">Livreur encaisse</th><th>Statut</th></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => setOpen(o)}>
                    <td>{o.number}<span className="sub">{dateTime(o.createdAt)}</span></td>
                    <td>{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</td>
                    <td>{o.recipientName}<span className="sub">{o.address.address}</span></td>
                    <td className="num">{formatMoney(o.dueNow)}</td>
                    <td className="num">{formatMoney(o.dueOnDelivery)}</td>
                    <td>
                      <Badge color={o.status === 'PAYMENT_DECLARED' && o.payment.mode === 'DIRECT' ? 'orange' : ORDER_STATUS[o.status][1]}>
                        {o.status === 'PAYMENT_DECLARED' && o.payment.mode === 'DIRECT' ? 'À confirmer' : o.status === 'IN_DELIVERY' && o.deliveryLabel ? o.deliveryLabel : ORDER_STATUS[o.status][0]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <OrderSheet o={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); load(); window.dispatchEvent(new Event('orders:changed')); }} />}
    </>
  );
}

function OrderSheet({ o, onClose, onChanged }: { o: Order; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [ask, setAsk] = useState<null | 'reject-payment' | 'cancel'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action: string, msg: string, body?: unknown) => {
    setBusy(true);
    try {
      await api(`/orders/shop/${o.id}/${action}`, { method: 'POST', body });
      toast(msg);
      onChanged();
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const p = o.payment;
  const d = o.delivery ?? {};
  return (
    <Sheet title={`Commande ${o.number}`} onClose={onClose} actions={<Badge color={ORDER_STATUS[o.status][1]}>{ORDER_STATUS[o.status][0]}</Badge>}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{o.recipientName}</div>
        <div className="muted">{dateTime(o.createdAt)} · {o.recipientPhone}</div>
      </div>
      {o.status === 'PAYMENT_DECLARED' && p.mode === 'DIRECT' && (
        <div className="li-actions">
          <button className="btn" disabled={busy} onClick={() => run('confirm-payment', 'Paiement confirmé · livreur VITE demandé')}>Paiement reçu</button>
          <button className="btn secondary" disabled={busy} onClick={() => setAsk('reject-payment')}>Pas reçu</button>
          <small className="muted grow">Vérifiez sur votre Mobile Money la réception de {formatMoney(o.dueNow)} (réf. {p.reference}). Dès confirmation, un livreur VITE vient chercher le colis.</small>
        </div>
      )}
      {o.status === 'PAYMENT_DECLARED' && p.mode === 'PLATFORM' && <div className="banner info">Payé à Adjamé-Smart (réf. {p.reference}) : l’équipe confirme la réception, puis la livraison part.</div>}
      {o.status === 'AWAITING_PAYMENT' && <div className="banner info">En attente du paiement du client ({formatMoney(o.dueNow)}).</div>}
      {o.status === 'PAID' && (
        <div className="li-actions">
          {d.error ? <>
            <button className="btn" disabled={busy} onClick={() => run('retry-delivery', 'Livreur VITE demandé')}>Relancer la livraison</button>
            <small className="muted grow">{d.error}</small>
          </> : <small className="muted grow">Livreur VITE demandé : préparez le colis.</small>}
        </div>
      )}
      {o.status === 'IN_DELIVERY' && (
        <div className="banner info">
          <span className="grow">{o.deliveryLabel ?? 'En livraison'}{d.driver ? ` · Livreur : ${d.driver.name}${d.driver.phone ? ` (${d.driver.phone})` : ''}` : ''}</span>
          {d.trackingUrl && <a className="btn secondary" href={d.trackingUrl} target="_blank" rel="noreferrer">Suivre</a>}
        </div>
      )}
      {o.status === 'CANCELLED' && <div className="alert"><strong>Annulée :</strong> {o.cancelReason}</div>}
      <div>
        <div className="section-title">Articles à préparer</div>
        <div className="group">
          <dl className="kv">
            {o.items.map((i, k) => <><dt key={`${k}n`}>{i.qty} × {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''}</dt><dd key={`${k}v`}>{formatMoney(i.subtotal)}</dd></>)}
          </dl>
        </div>
      </div>
      <div>
        <div className="section-title">Paiement</div>
        <div className="group">
          <dl className="kv">
            <dt>Acompte (Mobile Money)</dt><dd>{formatMoney(o.dueNow)} · {p.mode === 'DIRECT' ? 'reçu par vous' : 'reçu par Adjamé-Smart'}</dd>
            <dt>Encaissé par le livreur</dt><dd>{formatMoney(o.dueOnDelivery)}</dd>
            {p.reference && <><dt>Référence</dt><dd>{p.reference}{p.payerPhone ? ` · ${p.payerPhone}` : ''}</dd></>}
          </dl>
        </div>
      </div>
      <div>
        <div className="section-title">Livraison</div>
        <div className="group">
          <dl className="kv">
            <dt>Adresse</dt><dd>{[o.address.label, o.address.address, o.address.landmark].filter(Boolean).join(' · ')}</dd>
            {o.note && <><dt>Note du client</dt><dd>{o.note}</dd></>}
          </dl>
        </div>
      </div>
      {['AWAITING_PAYMENT', 'PAYMENT_DECLARED', 'PAID'].includes(o.status) && <div><button className="btn secondary" onClick={() => setAsk('cancel')}>Annuler la commande</button></div>}
      {ask && (
        <Modal title={ask === 'cancel' ? 'Annuler la commande' : 'Paiement non reçu'} subtitle="Le motif est affiché au client." onClose={() => setAsk(null)}
          footer={<><button className="btn secondary" onClick={() => setAsk(null)}>Retour</button><button className="btn" disabled={!note.trim() || busy} onClick={() => run(ask, ask === 'cancel' ? 'Commande annulée' : 'Client prévenu', { note: note.trim() })}>Valider</button></>}>
          <Field label="Motif"><input autoFocus value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={ask === 'cancel' ? 'Ex. : rupture de stock' : 'Ex. : montant non reçu'} /></Field>
        </Modal>
      )}
    </Sheet>
  );
}
