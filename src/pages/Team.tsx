import { useEffect, useState } from 'react';
import { api, date, errText, STAFF_LABEL, StaffRole, User } from '../api';
import { formatPhone } from '../countries';
import { Avatar, Badge, Card, Empty, Field, Icon, Modal, PageHeader, PhoneInput, Switch, useToast } from '../ui';

/** Équipe Adjamé-Smart : rôles (seul le Super Admin ajoute ou modifie) */
export default function Team({ me }: { me: User }) {
  const toast = useToast();
  const [rows, setRows] = useState<User[] | null>(null);
  const [adding, setAdding] = useState(false);
  useEffect(() => { api<User[]>('/admin/staff').then(setRows).catch(() => {}); }, []);
  const sa = me.staffRole === 'SUPER_ADMIN';
  const update = async (u: User, body: Partial<User>) => {
    try {
      setRows(await api<User[]>(`/admin/staff/${u.id}`, { method: 'PATCH', body }));
      toast('Équipe mise à jour');
    } catch (e) {
      toast(errText(e));
    }
  };
  return (
    <>
      <PageHeader title="Équipe" subtitle="Super Admin : tout. Modérateur : boutiques, revendeurs, catalogue. Support : consultation." actions={sa && <button className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={15} />Ajouter</button>} />
      <Card>
        {!rows ? <Empty icon="shield">Chargement…</Empty> : (
          <div className="table-scroll">
            <table className="list">
              <thead><tr><th>Membre</th><th>Rôle</th><th>Depuis</th><th>Actif</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Avatar name={u.name} /><div>{u.name}{u.id === me.id && <span className="muted"> (vous)</span>}<span className="sub">{formatPhone(u.phone)}</span></div></div></td>
                    <td>{sa && u.id !== me.id ? (
                      <select value={u.staffRole ?? 'SUPPORT'} onChange={(e) => update(u, { staffRole: e.target.value as StaffRole })}>
                        {(Object.keys(STAFF_LABEL) as StaffRole[]).map((r) => <option key={r} value={r}>{STAFF_LABEL[r]}</option>)}
                      </select>
                    ) : <Badge color={u.staffRole === 'SUPER_ADMIN' ? 'green' : 'gray'}>{u.staffRole ? STAFF_LABEL[u.staffRole] : '—'}</Badge>}</td>
                    <td>{date(u.createdAt)}</td>
                    <td>{sa && u.id !== me.id ? <Switch checked={u.active} onChange={(v) => update(u, { active: v })} label={u.active ? 'Désactiver' : 'Réactiver'} /> : u.active ? 'Oui' : 'Non'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {adding && <AddDialog onClose={() => setAdding(false)} onDone={(r) => { setRows(r); setAdding(false); }} />}
    </>
  );
}

function AddDialog({ onClose, onDone }: { onClose: () => void; onDone: (r: User[]) => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [staffRole, setStaffRole] = useState<StaffRole>('MODERATOR');
  const [error, setError] = useState('');
  const submit = async () => {
    try {
      onDone(await api<User[]>('/admin/staff', { method: 'POST', body: { name: name.trim(), phone, password, staffRole } }));
      toast(`${name} ajouté à l’équipe`);
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <Modal title="Ajouter un membre" subtitle="Il se connecte au back-office avec ce numéro et ce mot de passe." onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button><button className="btn" disabled={!name.trim() || !phone || password.length < 6} onClick={submit}>Ajouter</button></>}>
      <Field label="Nom"><input autoFocus value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></Field>
      <PhoneInput label="Téléphone" value={phone} onChange={setPhone} />
      <Field label="Mot de passe" hint="6 caractères minimum"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Rôle"><select value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRole)}>{(Object.keys(STAFF_LABEL) as StaffRole[]).map((r) => <option key={r} value={r}>{STAFF_LABEL[r]}</option>)}</select></Field>
      {error && <div className="alert error">{error}</div>}
    </Modal>
  );
}
