import { useCallback, useEffect, useState } from 'react';
import { canModerate } from '../App';
import { api, dateTime, errText, photoUrl, RESELLER_STATUS, ResellerRow, ResellerStatus, User } from '../api';
import { formatPhone } from '../countries';
import { Badge, Card, Empty, Field, Modal, PageHeader, Segmented, useToast } from '../ui';

/** Équipe : demandes du statut revendeur (prix de gros visibles une fois validé) */
export default function Resellers({ me }: { me: User }) {
  const toast = useToast();
  const [status, setStatus] = useState<ResellerStatus>('PENDING');
  const [rows, setRows] = useState<ResellerRow[] | null>(null);
  const [zoom, setZoom] = useState<[string, string] | null>(null);
  const [rejecting, setRejecting] = useState<ResellerRow | null>(null);
  const load = useCallback(() => api<ResellerRow[]>(`/admin/resellers?status=${status}`).then(setRows).catch(() => {}), [status]);
  useEffect(() => { load(); }, [load]);
  const approve = async (r: ResellerRow) => {
    try {
      await api(`/admin/resellers/${r.id}/approve`, { method: 'POST' });
      toast(`${r.name} est revendeur`);
      load();
      window.dispatchEvent(new Event('pending:changed'));
    } catch (e) {
      toast(errText(e));
    }
  };
  return (
    <>
      <PageHeader title="Revendeurs" subtitle="Clients qui achètent pour revendre : une fois validés, ils voient les prix de gros des grossistes." />
      <div className="toolbar"><Segmented<ResellerStatus> value={status} onChange={setStatus} options={[['PENDING', 'À vérifier'], ['APPROVED', 'Validés'], ['REJECTED', 'Refusés']]} /></div>
      <Card>
        {!rows ? <Empty icon="tag">Chargement…</Empty> : rows.length === 0 ? <Empty icon="tag">Aucune demande</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Client</th><th>Commerce</th><th>Photos</th><th>Demande</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}<span className="sub">{formatPhone(r.phone)}</span></td>
                    <td>{r.reseller?.businessName ?? '—'}<span className="sub">{r.reseller?.commune ?? ''}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.reseller?.shopPhotoUrl && <button className="btn plain" onClick={() => setZoom([r.reseller!.shopPhotoUrl!, 'Commerce'])}>Commerce</button>}
                      {r.idPhotoLink && <button className="btn plain" onClick={() => setZoom([r.idPhotoLink!, 'Pièce d’identité'])}>Pièce</button>}
                    </td>
                    <td>{dateTime(r.reseller?.submittedAt ?? null)}{r.reseller?.reviewedBy && <span className="sub">{r.reseller.reviewedBy}</span>}</td>
                    <td><Badge color={RESELLER_STATUS[r.resellerStatus][1]}>{RESELLER_STATUS[r.resellerStatus][0]}</Badge>{r.reseller?.note && <span className="sub">{r.reseller.note}</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{canModerate(me) && r.resellerStatus === 'PENDING' && <><button className="btn" onClick={() => approve(r)}>Valider</button><button className="btn plain" onClick={() => setRejecting(r)}>Refuser</button></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {zoom && <Modal title={zoom[1]} onClose={() => setZoom(null)} footer={<button className="btn" onClick={() => setZoom(null)}>Fermer</button>}><img className="proof-full" src={photoUrl(zoom[0])} alt={zoom[1]} /></Modal>}
      {rejecting && <RejectDialog r={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); load(); window.dispatchEvent(new Event('pending:changed')); }} />}
    </>
  );
}

function RejectDialog({ r, onClose, onDone }: { r: ResellerRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    try {
      await api(`/admin/resellers/${r.id}/reject`, { method: 'POST', body: { note } });
      toast('Demande refusée');
      onDone();
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <Modal title={`Refuser la demande de ${r.name}`} subtitle="Le motif est visible par le client." onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button><button className="btn danger" disabled={!note.trim()} onClick={submit}>Refuser</button></>}>
      <Field label="Motif" error={error}><input autoFocus value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}
