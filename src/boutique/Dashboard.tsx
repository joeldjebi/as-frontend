import { useEffect, useState } from 'react';
import { api, dateTime } from '../api';
import { formatMoney } from '../countries';
import { Order, ORDER_STATUS } from '../pages/Orders';
import { Badge, Card, Empty, PageHeader, Stat } from '../ui';
import { goTo } from './App';
import { MyProduct, MyShop } from './types';

const STATUS_NOTE: Record<string, [string, string] | undefined> = {
  DRAFT: ['Dossier à compléter', 'Finalisez et envoyez votre dossier depuis l’app Adjamé-Smart pour mettre la boutique en ligne.'],
  PENDING: ['Dossier en vérification', 'L’équipe Adjamé-Smart vérifie votre boutique. Vous pouvez déjà préparer vos produits.'],
  REJECTED: ['Dossier à corriger', ''],
  SUSPENDED: ['Boutique suspendue', 'Contactez l’équipe Adjamé-Smart.'],
};

/** Tableau de bord : à traiter, ventes, catalogue, dernières commandes */
export default function Dashboard({ shop }: { shop: MyShop }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<MyProduct[] | null>(null);
  useEffect(() => {
    setOrders(null);
    setProducts(null);
    if (shop.status === 'APPROVED') api<Order[]>(`/orders/shop?shopId=${shop.id}`).then(setOrders).catch(() => setOrders([]));
    else setOrders([]);
    api<MyProduct[]>(`/products/mine?shopId=${shop.id}`).then(setProducts).catch(() => setProducts([]));
  }, [shop]);

  const since = Date.now() - 30 * 86400_000;
  const o = orders ?? [];
  const toConfirm = o.filter((x) => x.status === 'PAYMENT_DECLARED' && x.payment.mode === 'DIRECT').length;
  const waiting = o.filter((x) => x.status === 'AWAITING_PAYMENT' || (x.status === 'PAYMENT_DECLARED' && x.payment.mode === 'PLATFORM')).length;
  const live = o.filter((x) => x.status === 'IN_DELIVERY' || x.status === 'PAID').length;
  const sold = o.filter((x) => ['PAID', 'IN_DELIVERY', 'DELIVERED'].includes(x.status) && Date.parse(x.createdAt) > since);
  const revenue = sold.reduce((t, x) => t + x.goodsTotal, 0);
  const p = products ?? [];
  const visible = p.filter((x) => x.status === 'ACTIVE').length;
  const out = p.filter((x) => x.status === 'ACTIVE' && x.totalStock != null && x.totalStock <= 0).length;
  const note = STATUS_NOTE[shop.status];

  return (
    <>
      <PageHeader title={shop.name} subtitle={[shop.type === 'GROSSISTE' ? 'Grossiste' : 'Boutique', shop.market].filter(Boolean).join(' · ')} actions={<Badge color={shop.status === 'APPROVED' ? (shop.isOpen ? 'green' : 'gray') : 'orange'}>{shop.status === 'APPROVED' ? (shop.isOpen ? 'Ouverte' : 'Fermée') : note?.[0]}</Badge>} />
      {note && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="grow"><strong>{note[0]}</strong>{(shop.reviewNote || note[1]) && ` · ${shop.status === 'REJECTED' ? shop.reviewNote : note[1]}`}</span>
        </div>
      )}
      <div className="grid grid-stats grid-4" style={{ marginBottom: 16 }}>
        <Stat label="Paiements à confirmer" value={toConfirm} icon="receipt" foot={waiting ? `${waiting} en attente du client` : 'Rien en attente'} onClick={() => goTo('orders')} />
        <Stat label="En livraison" value={live} icon="bike" foot="Livreurs VITE" onClick={() => goTo('orders')} />
        <Stat label="Ventes sur 30 jours" value={formatMoney(revenue)} icon="wallet" foot={`${sold.length} commande(s) payée(s)`} />
        <Stat label="Produits en ligne" value={visible} icon="box" foot={out ? `${out} épuisé(s)` : `${p.length} au total`} onClick={() => goTo('products')} />
      </div>
      <Card title="Dernières commandes" actions={<button className="btn secondary" onClick={() => goTo('orders')}>Tout voir</button>}>
        {!orders ? <Empty icon="receipt">Chargement…</Empty> : o.length === 0 ? <Empty icon="receipt">{shop.status === 'APPROVED' ? 'Les commandes de vos clients apparaîtront ici.' : 'Les commandes arrivent une fois la boutique en ligne.'}</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Commande</th><th>Client</th><th className="num">Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {o.slice(0, 6).map((x) => (
                  <tr key={x.id} className="clickable" onClick={() => goTo('orders')}>
                    <td>{x.number}<span className="sub">{dateTime(x.createdAt)}</span></td>
                    <td>{x.recipientName}</td>
                    <td className="num">{formatMoney(x.goodsTotal)}</td>
                    <td><Badge color={ORDER_STATUS[x.status][1]}>{x.status === 'IN_DELIVERY' && x.deliveryLabel ? x.deliveryLabel : ORDER_STATUS[x.status][0]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
