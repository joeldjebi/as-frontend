import { useEffect, useState } from 'react';
import { go } from '../App';
import { api, Dashboard } from '../api';
import { Card, PageHeader, Stat } from '../ui';

export default function Overview() {
  const [d, setD] = useState<Dashboard | null>(null);
  useEffect(() => { api<Dashboard>('/admin/dashboard').then(setD).catch(() => {}); }, []);
  if (!d) return <PageHeader title="Vue d’ensemble" subtitle="Chargement…" />;
  const raw = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <>
      <PageHeader title="Vue d’ensemble" subtitle={raw.charAt(0).toUpperCase() + raw.slice(1)} />
      {d.shopsPending > 0 && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <span className="grow"><strong>{d.shopsPending} boutique(s)</strong> attendent votre vérification.</span>
          <button className="btn" onClick={() => go('shops')}>Vérifier</button>
        </div>
      )}
      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <Stat icon="building" label="Boutiques en ligne" value={d.shopsApproved} foot={`${d.shopsPending} à vérifier · ${d.shopsDraft} en cours d’inscription`} onClick={() => go('shops')} />
        <Stat icon="people" label="Clients" value={d.customers} foot={`${d.customersWeek} nouveau(x) sur 7 jours`} onClick={() => go('customers')} />
        <Stat icon="tag" label="Revendeurs" value={d.resellers} foot={`${d.resellersPending} demande(s) à vérifier`} onClick={() => go('resellers')} />
        <Stat icon="box" label="Produits en ligne" value={d.products} foot={d.productsReported ? `${d.productsReported} signalé(s) à examiner` : 'aucun signalement'} onClick={() => go('products')} />
        <Stat icon="overview" label="Catégories" value={d.categories} foot="catégories principales actives" onClick={() => go('categories')} />
      </div>
      <Card title="Phases 1 et 2" pad>
        <p className="muted" style={{ margin: 0 }}>Boutiques, revendeurs, catégories, produits et recherche. Les commandes multi-boutiques et la livraison LETO arrivent en phase 3.</p>
      </Card>
    </>
  );
}
