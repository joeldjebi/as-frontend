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
        <Stat icon="box" label="Catégories" value={d.categories} foot="catégories principales actives" onClick={() => go('categories')} />
      </div>
      <Card title="Phase 1 · socle" pad>
        <p className="muted" style={{ margin: 0 }}>Inscription des boutiques et des revendeurs, catalogue de catégories, équipe. Produits, commandes et livraisons LETO arrivent dans les phases suivantes.</p>
      </Card>
    </>
  );
}
