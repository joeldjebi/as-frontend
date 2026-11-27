import { useCallback, useEffect, useState } from 'react';
import { api, dateTime, errText, User } from '../api';
import { formatMoney } from '../countries';
import { Badge, Card, Empty, Field, Modal, PageHeader, Segmented, Sheet, useToast } from '../ui';

type Status = 'AWAITING_PAYMENT' | 'PAYMENT_DECLARED' | 'PAID' | 'IN_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED';
type Filter = 'confirm' | 'deliver' | 'live' | 'all';

interface Order {
  id: string;
  number: string;
  shopName: string;
  status: Status;
  items: { name: string; variantLabel: string | null; qty: number; price: number; subtotal: number; prepayPercent: number }[];
  goodsTotal: number;
  dueNow: number;
  dueOnDelivery: number;
  deliveryFeeEstimate: number | null;
  recipientName: string;
  recipientPhone: string;
  address: { label: string; address: string; landmark: string | null };
  note: string | null;
  payment: { mode: 'DIRECT' | 'PLATFORM'; alias: string | null; payee: string; reference?: string | null; payerPhone?: string | null; declaredAt?: string | null; confirmedAt?: string | null; confirmedBy?: string | null; rejectedNote?: string | null };
  delivery: { deliveryId?: string | null; status?: string | null; trackingUrl?: string | null; price?: number | null; driver?: { name: string; phone?: string | null } | null; error?: string | null; confirmationCode?: string | null };
  deliveryLabel: string | null;
  cancelReason: string | null;
  history: { at: string; status: string; by?: string; note?: string }[];
  createdAt: string;
}
interface Data {
  counts: { toConfirm: number; toDeliver: number; inDelivery: number; total: number };
  items: Order[];
}

export const ORDER_STATUS: Record<Status, [string, string]> = {
  AWAITING_PAYMENT: ['À payer', 'orange'],
  PAYMENT_DECLARED: ['Paiement à vérifier', 'yellow'],
  PAID: ['Payée', 'blue'],
  IN_DELIVERY: ['En livraison', 'accent'],
  DELIVERED: ['Livrée', 'green'],
  CANCELLED: ['Annulée', 'gray'],
  FAILED: ['Livraison impossible', 'red'],
};

const canPay = (me: User) => me.staffRole === 'SUPER_ADMIN' || me.staffRole === 'SUPPORT';

/** Équipe : commandes, confirmation des paiements reçus par Adjamé-Smart, relance des livraisons VITE */
export default function Orders({ me }: { me: User }) {
  const [filter, setFilter] = useState<Filter>('confirm');
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState<Order | null>(null);
  const load = useCallback(() => api<Data>('/orders/admin').then(setData).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = window.setInterval(load, 20_000);
    return () => window.clearInterval(t);
  }, [load]);
  const c = data?.counts;
  const items = (data?.items ?? []).filter((o) =>
    filter === 'confirm' ? o.status === 'PAYMENT_DECLARED' && o.payment.mode === 'PLATFORM'
      : filter === 'deliver' ? o.status === 'PAID'
        : filter === 'live' ? o.status === 'IN_DELIVERY'
          : true,
  );
  return (
    <>
      <PageHeader title="Commandes" subtitle={c ? `${c.total} commande(s) · ${c.toConfirm} paiement(s) à confirmer · ${c.inDelivery} en livraison` : 'Chargement…'} />
      <div className="toolbar">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            ['confirm', `Paiements à confirmer${c ? ` (${c.toConfirm})` : ''}`],
            ['deliver', `Livraison à lancer${c ? ` (${c.toDeliver})` : ''}`],
            ['live', `En livraison${c ? ` (${c.inDelivery})` : ''}`],
            ['all', 'Toutes'],
          ]}
        />
      </div>
      <Card>
        {!data ? <Empty icon="receipt">Chargement…</Empty> : items.length === 0 ? <Empty icon="receipt">{filter === 'confirm' ? 'Aucun paiement à confirmer' : 'Aucune commande'}</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Commande</th><th>Boutique</th><th>Client</th><th className="num">Acompte</th><th className="num">À la livraison</th><th>Paiement</th><th>Statut</th></tr></thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className="clickable" onClick={() => setOpen(o)}>
                    <td>{o.number}<span className="sub">{dateTime(o.createdAt)}</span></td>
                    <td>{o.shopName}</td>
                    <td>{o.recipientName}<span className="sub">{o.recipientPhone}</span></td>
                    <td className="num">{formatMoney(o.dueNow)}</td>
                    <td className="num">{formatMoney(o.dueOnDelivery)}</td>
                    <td>{o.payment.mode === 'PLATFORM' ? 'Adjamé-Smart' : 'Boutique'}{o.payment.reference && <span className="sub">réf. {o.payment.reference}</span>}</td>
                    <td><Badge color={ORDER_STATUS[o.status][1]}>{o.status === 'IN_DELIVERY' && o.deliveryLabel ? o.deliveryLabel : ORDER_STATUS[o.status][0]}</Badge>{o.delivery?.error && <span className="sub">{o.delivery.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <OrderSheet o={open} me={me} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); load(); }} />}
    </>
  );
}

function OrderSheet({ o, me, onClose, onChanged }: { o: Order; me: User; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [ask, setAsk] = useState<null | 'reject-payment' | 'cancel'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (path: string, msg: string, body?: unknown) => {
    setBusy(true);
    try {
      await api(`/orders/admin/${o.id}/${path}`, { method: 'POST', body });
      toast(msg);
      onChanged();
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const allowed = canPay(me);
  const p = o.payment;
  return (
    <Sheet title={`Commande ${o.number}`} onClose={onClose} actions={<Badge color={ORDER_STATUS[o.status][1]}>{ORDER_STATUS[o.status][0]}</Badge>}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{o.shopName}</div>
        <div className="muted">{dateTime(o.createdAt)} · {o.recipientName} · {o.recipientPhone}</div>
      </div>
      {allowed && o.status === 'PAYMENT_DECLARED' && (
        <div className="li-actions">
          <button className="btn" disabled={busy} onClick={() => run('confirm-payment', 'Paiement confirmé · course VITE demandée')}>Paiement reçu</button>
          <button className="btn secondary" disabled={busy} onClick={() => setAsk('reject-payment')}>Pas reçu</button>
          <small className="muted grow">{p.mode === 'DIRECT' ? 'Payé à la boutique : elle confirme normalement elle-même.' : `Vérifiez la réception de ${formatMoney(o.dueNow)} (réf. ${p.reference}).`}</small>
        </div>
      )}
      {allowed && o.status === 'PAID' && (
        <div className="li-actions">
          <button className="btn" disabled={busy} onClick={() => run('retry-delivery', 'Course VITE demandée')}>Lancer la livraison</button>
          {o.delivery?.error && <small className="muted grow">{o.delivery.error}</small>}
        </div>
      )}
      {o.status === 'CANCELLED' && <div className="alert"><strong>Annulée :</strong> {o.cancelReason}</div>}
      <div>
        <div className="section-title">Paiement</div>
        <div className="group">
          <dl className="kv">
            <dt>Encaissé par</dt><dd>{p.payee}{p.alias ? ` · ${p.alias}` : ''}</dd>
            <dt>Acompte (Mobile Money)</dt><dd>{formatMoney(o.dueNow)}</dd>
            <dt>Reste à la livraison</dt><dd>{formatMoney(o.dueOnDelivery)}</dd>
            <dt>Référence</dt><dd>{p.reference ?? '—'}{p.payerPhone ? ` · ${p.payerPhone}` : ''}</dd>
            {p.confirmedAt && <><dt>Confirmé</dt><dd>{dateTime(p.confirmedAt)} · {p.confirmedBy}</dd></>}
            {p.rejectedNote && <><dt>Refusé</dt><dd>{p.rejectedNote}</dd></>}
          </dl>
        </div>
      </div>
      <div>
        <div className="section-title">Articles</div>
        <div className="group">
          <dl className="kv">
            {o.items.map((i, k) => <><dt key={`${k}n`}>{i.qty} × {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ''}</dt><dd key={`${k}v`}>{formatMoney(i.subtotal)}{i.prepayPercent < 100 ? ` · acompte ${i.prepayPercent} %` : ''}</dd></>)}
          </dl>
        </div>
      </div>
      <div>
        <div className="section-title">Livraison VITE</div>
        <div className="group">
          <dl className="kv">
            <dt>Adresse</dt><dd>{[o.address.label, o.address.address, o.address.landmark].filter(Boolean).join(' · ')}</dd>
            {o.note && <><dt>Note</dt><dd>{o.note}</dd></>}
            <dt>Course</dt><dd>{o.delivery?.deliveryId ? (o.deliveryLabel ?? o.delivery.status) : 'Pas encore demandée'}</dd>
            {o.delivery?.driver && <><dt>Livreur</dt><dd>{o.delivery.driver.name}{o.delivery.driver.phone ? ` · ${o.delivery.driver.phone}` : ''}</dd></>}
            {o.delivery?.price != null && <><dt>Frais</dt><dd>{formatMoney(o.delivery.price)} (payés par le client au livreur)</dd></>}
            {o.delivery?.trackingUrl && <><dt>Suivi</dt><dd><a href={o.delivery.trackingUrl} target="_blank" rel="noreferrer">Ouvrir le suivi</a></dd></>}
          </dl>
        </div>
      </div>
      <div>
        <div className="section-title">Historique</div>
        <ul className="timeline">
          {o.history.map((h, i) => <li key={i}><span className="tdot" /><div><div>{ORDER_STATUS[h.status as Status]?.[0] ?? (h.status === 'PAYMENT_REJECTED' ? 'Paiement refusé' : h.status)}{h.note ? ` · ${h.note}` : ''}</div><small className="muted">{dateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</small></div></li>)}
        </ul>
      </div>
      {allowed && ['AWAITING_PAYMENT', 'PAYMENT_DECLARED', 'PAID'].includes(o.status) && (
        <div><button className="btn secondary" onClick={() => setAsk('cancel')}>Annuler la commande</button></div>
      )}
      {ask && (
        <Modal title={ask === 'cancel' ? 'Annuler la commande' : 'Paiement non reçu'} subtitle="Le motif est affiché au client." onClose={() => setAsk(null)}
          footer={<><button className="btn secondary" onClick={() => setAsk(null)}>Retour</button><button className="btn" disabled={!note.trim() || busy} onClick={() => run(ask, ask === 'cancel' ? 'Commande annulée' : 'Client prévenu', { note: note.trim() })}>Valider</button></>}>
          <Field label="Motif"><input autoFocus value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={ask === 'cancel' ? 'Ex. : rupture de stock' : 'Ex. : montant non reçu'} /></Field>
        </Modal>
      )}
    </Sheet>
  );
}
