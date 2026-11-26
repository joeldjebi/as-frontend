import { useEffect, useState } from 'react';
import { canModerate } from '../App';
import { api, date, errText, RESELLER_STATUS, ResellerStatus, User } from '../api';
import { formatPhone } from '../countries';
import { Badge, Card, Empty, PageHeader, Search, Switch, useToast } from '../ui';

interface Row { id: string; name: string; phone: string; active: boolean; resellerStatus: ResellerStatus; createdAt: string; shops: number }

export default function Customers({ me }: { me: User }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => api<Row[]>(`/admin/customers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`).then(setRows).catch(() => {}), 250);
    return () => window.clearTimeout(t);
  }, [q]);
  const toggle = async (r: Row, active: boolean) => {
    try {
      await api(`/admin/customers/${r.id}/active`, { method: 'PATCH', body: { active } });
      setRows((x) => x?.map((y) => (y.id === r.id ? { ...y, active } : y)) ?? null);
      toast(active ? `${r.name} réactivé` : `${r.name} désactivé : il ne peut plus se connecter`);
    } catch (e) {
      toast(errText(e));
    }
  };
  return (
    <>
      <PageHeader title="Clients" subtitle="Comptes de l’app : clients, revendeurs et vendeurs." />
      <div className="toolbar"><span className="spacer" /><Search value={q} onChange={setQ} placeholder="Nom ou téléphone" /></div>
      <Card>
        {!rows ? <Empty icon="people">Chargement…</Empty> : rows.length === 0 ? <Empty icon="people">Aucun client</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Client</th><th>Inscrit le</th><th>Revendeur</th><th className="num">Boutiques</th><th>Actif</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}<span className="sub">{formatPhone(r.phone)}</span></td>
                    <td>{date(r.createdAt)}</td>
                    <td>{r.resellerStatus === 'NONE' ? <span className="muted">—</span> : <Badge color={RESELLER_STATUS[r.resellerStatus][1]}>{RESELLER_STATUS[r.resellerStatus][0]}</Badge>}</td>
                    <td className="num">{r.shops}</td>
                    <td>{canModerate(me) ? <Switch checked={r.active} onChange={(v) => toggle(r, v)} label={r.active ? 'Désactiver' : 'Réactiver'} /> : r.active ? 'Oui' : 'Non'}</td>
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
