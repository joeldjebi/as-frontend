import { useCallback, useEffect, useState } from 'react';
import { canModerate } from '../App';
import { AdminProduct, api, dateTime, errText, photoUrl, PRODUCT_STATUS, User } from '../api';
import { formatMoney } from '../countries';
import { Badge, Card, Empty, Field, Modal, PageHeader, Search, Segmented, Sheet, useToast } from '../ui';

type Filter = 'reported' | 'removed' | 'all';

/** Équipe : produits signalés par les clients, retrait (contrefaçon, interdit…) ou levée du signalement */
export default function Products({ me }: { me: User }) {
  const [filter, setFilter] = useState<Filter>('reported');
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ counts: { total: number; reported: number; removed: number }; items: AdminProduct[] } | null>(null);
  const [open, setOpen] = useState<AdminProduct | null>(null);
  const load = useCallback(() => api<{ counts: { total: number; reported: number; removed: number }; items: AdminProduct[] }>(`/products/admin?filter=${filter}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`).then(setData).catch(() => {}), [filter, q]);
  useEffect(() => { const t = window.setTimeout(load, 200); return () => window.clearTimeout(t); }, [load]);
  const c = data?.counts;
  return (
    <>
      <PageHeader title="Produits" subtitle={c ? `${c.total} produit(s) · ${c.reported} signalé(s) · ${c.removed} retiré(s)` : 'Chargement…'} />
      <div className="toolbar">
        <Segmented<Filter> value={filter} onChange={setFilter} options={[['reported', `Signalés${c ? ` (${c.reported})` : ''}`], ['removed', `Retirés${c ? ` (${c.removed})` : ''}`], ['all', 'Tous']]} />
        <span className="spacer" />
        <Search value={q} onChange={setQ} placeholder="Produit, boutique, catégorie" />
      </div>
      <Card>
        {!data ? <Empty icon="box">Chargement…</Empty> : data.items.length === 0 ? <Empty icon="box">{filter === 'reported' ? 'Aucun produit signalé' : 'Aucun produit'}</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Produit</th><th>Boutique</th><th className="num">Prix</th><th className="num">Signalements</th><th>Statut</th></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => setOpen(p)}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {p.photos[0] && <img src={photoUrl(p.photos[0])} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />}
                        <div>{p.name}<span className="sub">ajouté le {dateTime(p.createdAt)} · {p.views} vue(s)</span></div>
                      </div>
                    </td>
                    <td>{p.shopName}</td>
                    <td className="num">{formatMoney(p.price)}{p.wholesalePrice != null && <span className="sub">gros {formatMoney(p.wholesalePrice)} dès {p.wholesaleMinQty}</span>}</td>
                    <td className="num">{p.reports ? <Badge color="orange">{p.reports}</Badge> : 0}</td>
                    <td><Badge color={PRODUCT_STATUS[p.status][1]}>{PRODUCT_STATUS[p.status][0]}</Badge>{p.moderationNote && <span className="sub">{p.moderationNote}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <ProductSheet p={open} me={me} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); load(); window.dispatchEvent(new Event('pending:changed')); }} />}
    </>
  );
}

function ProductSheet({ p, me, onClose, onChanged }: { p: AdminProduct; me: User; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [removing, setRemoving] = useState(false);
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  const run = async (path: string, msg: string, body?: unknown) => {
    try {
      await api(`/products/admin/${p.id}/${path}`, { method: 'POST', body });
      toast(msg);
      onChanged();
    } catch (e) {
      toast(errText(e));
    }
  };
  const mod = canModerate(me);
  return (
    <Sheet title="Produit" onClose={onClose} actions={<Badge color={PRODUCT_STATUS[p.status][1]}>{PRODUCT_STATUS[p.status][0]}</Badge>}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{p.name}</div>
        <div className="muted">{p.shopName} · {formatMoney(p.price)}{p.wholesalePrice != null ? ` · gros ${formatMoney(p.wholesalePrice)} dès ${p.wholesaleMinQty}` : ''}</div>
      </div>
      {mod && p.status !== 'REMOVED' && (
        <div className="li-actions">
          <button className="btn danger" onClick={() => setRemoving(true)}>Retirer le produit</button>
          {p.reports > 0 && <button className="btn secondary" onClick={() => run('clear', 'Signalements levés · le produit reste masqué jusqu’à ce que le vendeur le réactive')}>Lever les signalements</button>}
          <small className="muted grow">Retiré, le produit disparaît de l’app et le vendeur ne peut plus le réactiver.</small>
        </div>
      )}
      {p.status === 'REMOVED' && <div className="alert error"><strong>Retiré :</strong> « {p.moderationNote} »{p.moderatedBy && ` · ${p.moderatedBy}`}</div>}
      <div>
        <div className="section-title">Photos</div>
        <div className="li-photos">
          {p.photos.map((u, i) => (
            <figure key={u}><button type="button" onClick={() => setZoom(u)} aria-label={`Photo ${i + 1}`}><img src={photoUrl(u)} alt={`Photo ${i + 1}`} /></button></figure>
          ))}
        </div>
      </div>
      {p.description && <div><div className="section-title">Description</div><p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{p.description}</p></div>}
      {p.variants.length > 0 && (
        <div>
          <div className="section-title">Variantes</div>
          <div className="group"><dl className="kv">{p.variants.map((v) => <><dt key={`${v.id}l`}>{v.label}</dt><dd key={`${v.id}v`}>{formatMoney(v.price ?? p.price)} · {v.stock == null ? 'stock non suivi' : `${v.stock} en stock`}</dd></>)}</dl></div>
        </div>
      )}
      {p.reportsList.length > 0 && (
        <div>
          <div className="section-title">Signalements</div>
          <ul className="timeline">
            {p.reportsList.map((r, i) => (
              <li key={i}><span className="tdot" style={{ background: 'var(--orange)' }} /><div><div>« {r.reason} »</div><small className="muted">{dateTime(r.at)}</small></div></li>
            ))}
          </ul>
        </div>
      )}
      {removing && (
        <Modal title="Retirer le produit" subtitle="Le motif est affiché au vendeur." onClose={() => setRemoving(false)}
          footer={<><button className="btn secondary" onClick={() => setRemoving(false)}>Annuler</button><button className="btn danger" disabled={!note.trim()} onClick={() => run('remove', 'Produit retiré', { note: note.trim() })}>Retirer</button></>}>
          <Field label="Motif"><input autoFocus value={note} maxLength={500} placeholder="Ex. : contrefaçon, produit interdit, photo trompeuse…" onChange={(e) => setNote(e.target.value)} /></Field>
        </Modal>
      )}
      {zoom && <Modal title={p.name} onClose={() => setZoom(null)} footer={<button className="btn" onClick={() => setZoom(null)}>Fermer</button>}><img className="proof-full" src={photoUrl(zoom)} alt={p.name} /></Modal>}
    </Sheet>
  );
}
