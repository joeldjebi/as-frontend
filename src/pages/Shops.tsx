import { useCallback, useEffect, useState } from 'react';
import { canModerate } from '../App';
import { api, date, dateTime, errText, photoUrl, Shop, SHOP_STATUS, ShopRow, ShopStatus, User } from '../api';
import { formatPhone } from '../countries';
import { Avatar, Badge, Card, Empty, Field, Icon, Modal, PageHeader, Search, Segmented, Sheet, Switch, useToast } from '../ui';

type Filter = ShopStatus | 'ALL';
const ID_LABEL: Record<string, string> = { CNI: 'CNI', PASSPORT: 'Passeport', CONSULAR: 'Carte consulaire', RESIDENCE: 'Carte de séjour' };
const DAYS = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HISTORY: Record<string, string> = { CREATED: 'Boutique créée dans l’app', SUBMITTED: 'Dossier envoyé', APPROVED: 'Boutique validée', REJECTED: 'Dossier refusé', SUSPENDED: 'Boutique suspendue', REACTIVATED: 'Boutique réactivée' };

/** Équipe : boutiques et grossistes d'Adjamé — vérification des dossiers, validation, suspension */
export default function Shops({ me }: { me: User }) {
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [data, setData] = useState<{ items: ShopRow[]; counts: Record<ShopStatus, number> } | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => api<{ items: ShopRow[]; counts: Record<ShopStatus, number> }>(`/shops/admin${filter === 'ALL' ? '' : `?status=${filter}`}`).then(setData).catch(() => {}), [filter]);
  useEffect(() => { load(); }, [load]);
  const c = data?.counts;
  const rows = (data?.items ?? []).filter((r) => `${r.name} ${r.ownerName} ${r.ownerPhone} ${r.market ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="Boutiques" subtitle={c ? `${c.APPROVED} en ligne · ${c.PENDING} à vérifier` : 'Chargement…'} />
      <div className="toolbar">
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          ['PENDING', `À vérifier${c ? ` (${c.PENDING})` : ''}`], ['APPROVED', `En ligne${c ? ` (${c.APPROVED})` : ''}`], ['REJECTED', `Refusées${c ? ` (${c.REJECTED})` : ''}`],
          ['SUSPENDED', `Suspendues${c ? ` (${c.SUSPENDED})` : ''}`], ['DRAFT', `Brouillons${c ? ` (${c.DRAFT})` : ''}`], ['ALL', 'Toutes'],
        ]} />
        <span className="spacer" />
        <Search value={q} onChange={setQ} placeholder="Boutique, gérant, marché" />
      </div>
      <Card>
        {!data ? <Empty icon="building">Chargement…</Empty> : rows.length === 0 ? <Empty icon="building">{filter === 'PENDING' ? 'Aucune boutique à vérifier' : 'Aucune boutique'}</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Boutique</th><th>Emplacement</th><th>Gérant</th><th>Envoyée le</th><th>Statut</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => setOpen(r.id)}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {r.storefrontUrl ? <img src={photoUrl(r.storefrontUrl)} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /> : <Avatar name={r.name} />}
                        <div>{r.name}<span className="sub">{r.type === 'GROSSISTE' ? 'Grossiste' : 'Boutique'}{r.phone ? ` · ${formatPhone(r.phone)}` : ''}</span></div>
                      </div>
                    </td>
                    <td>{r.market ?? <span className="muted">—</span>}<span className="sub">{r.location ?? ''}</span></td>
                    <td>{r.ownerName}<span className="sub">{formatPhone(r.ownerPhone)}</span></td>
                    <td>{r.submittedAt ? dateTime(r.submittedAt) : <span className="muted">Pas encore envoyée</span>}</td>
                    <td><Badge color={SHOP_STATUS[r.status][1]}>{SHOP_STATUS[r.status][0]}</Badge>{r.reviewNote && <span className="sub">{r.reviewNote}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <ShopSheet id={open} me={me} onClose={() => setOpen(null)} onChanged={() => { load(); window.dispatchEvent(new Event('pending:changed')); }} />}
    </>
  );
}

function ShopSheet({ id, me, onClose, onChanged }: { id: string; me: User; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [s, setS] = useState<Shop | null>(null);
  const [motif, setMotif] = useState<'reject' | 'suspend' | null>(null);
  const [zoom, setZoom] = useState<[string, string] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Liens des pièces valables 15 min : rechargés à chaque ouverture
  useEffect(() => { api<Shop>(`/shops/admin/${id}`).then(setS).catch((e) => setError(errText(e))); }, [id]);
  const act = async (path: string, msg: string, body?: unknown) => {
    setBusy(true);
    try {
      setS(await api<Shop>(`/shops/admin/${id}/${path}`, { method: 'POST', body }));
      toast(msg);
      onChanged();
      return true;
    } catch (e) {
      toast(errText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const mod = canModerate(me);
  const photos: [string | null, string][] = s ? [[s.storefrontUrl, 'Devanture'], [s.logoUrl, 'Logo'], [s.ownerIdFrontLink, 'Pièce (recto)'], [s.ownerIdBackLink, 'Pièce (verso)']] : [];
  return (
    <Sheet title="Dossier de la boutique" onClose={onClose} actions={s && <Badge color={SHOP_STATUS[s.status][1]}>{SHOP_STATUS[s.status][0]}</Badge>}>
      {error && <div className="alert error">{error}</div>}
      {!s ? !error && <Empty icon="building">Chargement…</Empty> : (
        <>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{s.name}</div>
            <div className="muted">{s.type === 'GROSSISTE' ? 'Grossiste' : 'Boutique'} · {s.categories.map((c) => c.name).join(', ') || 'aucune catégorie'}</div>
          </div>
          {mod && (s.status === 'PENDING' || s.status === 'REJECTED' || s.status === 'APPROVED' || s.status === 'SUSPENDED') && (
            <div className="li-actions">
              {(s.status === 'PENDING' || s.status === 'REJECTED') && <button className="btn" disabled={busy} onClick={() => act('approve', `${s.name} est en ligne`)}><Icon name="check" size={15} />Valider la boutique</button>}
              {s.status === 'PENDING' && <button className="btn danger" disabled={busy} onClick={() => setMotif('reject')}>Refuser</button>}
              {s.status === 'APPROVED' && <button className="btn danger" disabled={busy} onClick={() => setMotif('suspend')}>Suspendre</button>}
              {s.status === 'SUSPENDED' && <button className="btn" disabled={busy} onClick={() => act('reactivate', `${s.name} réactivée`)}>Réactiver</button>}
              <small className="muted grow">
                {s.status === 'PENDING' && 'Vérifiez les photos, la pièce du gérant et l’emplacement avant de valider.'}
                {s.status === 'APPROVED' && 'Suspendue, la boutique disparaît de l’app.'}
                {s.status === 'SUSPENDED' && 'Réactivée, elle réapparaît dans l’app.'}
                {s.status === 'REJECTED' && 'Le vendeur peut corriger son dossier et le renvoyer.'}
              </small>
            </div>
          )}
          {mod && s.status === 'APPROVED' && (
            <div className="group rows">
              <div>
                <div className="grow"><div className="title">Mise en avant</div><small className="muted">Affichée dans « Boutiques à la une » sur l’accueil de l’app</small></div>
                <Switch checked={s.featured} label={s.featured ? 'Retirer de la une' : 'Mettre à la une'} onChange={(v) => act('featured', v ? `${s.name} est à la une` : `${s.name} n’est plus à la une`, { featured: v })} />
              </div>
            </div>
          )}
          {s.status === 'DRAFT' && <div className="alert info">Inscription en cours dans l’app : le dossier n’a pas encore été envoyé.</div>}
          {s.reviewNote && <div className="alert error"><strong>{s.status === 'SUSPENDED' ? 'Motif de la suspension' : 'Motif du refus'} :</strong> « {s.reviewNote} »{s.reviewedBy && <> · {s.reviewedBy}, {dateTime(s.reviewedAt)}</>}</div>}
          {s.required.some((x) => !x.ok) && (
            <div className="alert info">Éléments manquants : {s.required.filter((x) => !x.ok).map((x) => x.label).join(', ')}</div>
          )}
          <div>
            <div className="section-title">Photos</div>
            <div className="li-photos">
              {photos.map(([url, label]) => (
                <figure key={label}>
                  {url ? <button type="button" onClick={() => setZoom([url, label])} aria-label={`Agrandir : ${label}`}><img src={photoUrl(url)} alt={label} loading="lazy" /></button> : <div className="li-missing"><Icon name="camera" size={18} />Manquante</div>}
                  <figcaption>{label}</figcaption>
                </figure>
              ))}
            </div>
            <small className="muted">Pièces d’identité privées : liens valables 15 minutes, rouvrez la fiche si une photo ne s’affiche plus.</small>
          </div>
          <div>
            <div className="section-title">Emplacement à Adjamé</div>
            <div className="group">
              <dl className="kv">
                <dt>Marché ou zone</dt><dd>{s.market ?? '—'}</dd>
                <dt>Allée, n°, repère</dt><dd>{s.location ?? '—'}</dd>
                <dt>Position</dt><dd>{s.lat != null ? <a href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer">Voir sur la carte</a> : '—'}</dd>
                <dt>Téléphone</dt><dd>{s.phone ? formatPhone(s.phone) : '—'}</dd>
                <dt>Horaires</dt><dd>{s.hours ? `${s.hours.open} – ${s.hours.close} · ${s.hours.days.map((d) => DAYS[d]).join(', ')}` : '—'}</dd>
              </dl>
            </div>
          </div>
          <div>
            <div className="section-title">Gérant</div>
            <div className="group">
              <dl className="kv">
                <dt>Nom</dt><dd>{s.owner?.name ?? '—'}</dd>
                <dt>Téléphone</dt><dd>{s.owner ? formatPhone(s.owner.phone) : '—'}</dd>
                <dt>Pièce d’identité</dt><dd>{s.ownerIdType ? ID_LABEL[s.ownerIdType] : '—'}{s.ownerIdNumber ? ` · n° ${s.ownerIdNumber}` : ''}</dd>
                <dt>Registre du commerce</dt><dd>{s.tradeRegister ?? <span className="muted">Non renseigné</span>}</dd>
                <dt>Compte créé le</dt><dd>{s.owner ? date(s.owner.createdAt) : '—'}</dd>
              </dl>
            </div>
          </div>
          {s.description && <div><div className="section-title">Description</div><p style={{ margin: 0 }}>{s.description}</p></div>}
          <div>
            <div className="section-title">Historique</div>
            <ul className="timeline">
              {[...s.history].reverse().map((h, i) => (
                <li key={i}>
                  <span className="tdot" style={{ background: h.action === 'REJECTED' || h.action === 'SUSPENDED' ? 'var(--red)' : h.action === 'APPROVED' || h.action === 'REACTIVATED' ? 'var(--green)' : 'var(--tertiary)' }} />
                  <div style={{ flex: 1 }}>
                    <div>{HISTORY[h.action] ?? h.action}{h.by && <span className="muted"> · {h.by}</span>}</div>
                    {h.note && <small className="muted" style={{ display: 'block' }}>« {h.note} »</small>}
                    <small className="muted">{dateTime(h.at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {motif && s && <MotifDialog kind={motif} name={s.name} onClose={() => setMotif(null)} onSubmit={async (note) => {
        if (await act(motif, motif === 'reject' ? 'Dossier refusé · le vendeur est prévenu dans l’app' : `${s.name} suspendue`, { note })) setMotif(null);
      }} />}
      {zoom && (
        <Modal title={zoom[1]} subtitle={s?.name} onClose={() => setZoom(null)} footer={<><a className="btn secondary" href={photoUrl(zoom[0])} target="_blank" rel="noreferrer">Ouvrir en grand</a><button className="btn" onClick={() => setZoom(null)}>Fermer</button></>}>
          <img className="proof-full" src={photoUrl(zoom[0])} alt={zoom[1]} />
        </Modal>
      )}
    </Sheet>
  );
}

function MotifDialog({ kind, name, onClose, onSubmit }: { kind: 'reject' | 'suspend'; name: string; onClose: () => void; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal title={kind === 'reject' ? 'Refuser le dossier' : `Suspendre ${name}`} subtitle={kind === 'reject' ? 'Le vendeur voit ce motif dans l’app et peut corriger son dossier.' : 'La boutique disparaît de l’app. Le motif est affiché au vendeur.'} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button><button className="btn danger" onClick={() => (note.trim() ? onSubmit(note.trim()) : setError('Motif obligatoire'))}>{kind === 'reject' ? 'Refuser' : 'Suspendre'}</button></>}>
      <Field label="Motif" error={error}>
        <textarea autoFocus maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'reject' ? 'Ex. : photo de la pièce floue, emplacement introuvable…' : 'Ex. : produits contrefaits signalés…'} />
      </Field>
    </Modal>
  );
}
