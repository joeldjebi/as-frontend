import { useEffect, useState } from 'react';
import { canModerate } from '../App';
import { api, Category, errText, User } from '../api';
import { Card, Empty, Field, Icon, Modal, PageHeader, Switch, useToast } from '../ui';

/** Équipe : arbre des catégories (principales et sous-catégories) affiché dans l'app */
export default function Categories({ me }: { me: User }) {
  const toast = useToast();
  const [tree, setTree] = useState<Category[] | null>(null);
  const [edit, setEdit] = useState<{ parentId: string | null; c?: Category } | null>(null);
  useEffect(() => { api<Category[]>('/categories/all').then(setTree).catch(() => {}); }, []);
  const mod = canModerate(me);
  const run = async (f: () => Promise<Category[]>, msg: string) => {
    try {
      setTree(await f());
      toast(msg);
    } catch (e) {
      toast(errText(e));
    }
  };
  return (
    <>
      <PageHeader title="Catégories" subtitle="Rayons de l’app : les boutiques choisissent jusqu’à 5 catégories à l’inscription." actions={mod && <button className="btn" onClick={() => setEdit({ parentId: null })}><Icon name="plus" size={15} />Nouvelle catégorie</button>} />
      {!tree ? <Empty icon="box">Chargement…</Empty> : (
        <div className="stack">
          {tree.map((c) => (
            <Card key={c.id} title={c.name} actions={mod && <>
              <Switch checked={c.active} onChange={(v) => run(() => api(`/categories/${c.id}`, { method: 'PATCH', body: { active: v } }), v ? 'Catégorie affichée' : 'Catégorie masquée dans l’app')} label={c.active ? 'Masquer' : 'Afficher'} />
              <button className="btn plain" onClick={() => setEdit({ parentId: null, c })}>Modifier</button>
              <button className="btn secondary" onClick={() => setEdit({ parentId: c.id })}><Icon name="plus" size={14} />Sous-catégorie</button>
            </>}>
              <div className="rows">
                {(c.children ?? []).length === 0 && <div><small className="muted grow">Aucune sous-catégorie</small></div>}
                {(c.children ?? []).map((s) => (
                  <div key={s.id}>
                    <span className="grow" style={{ opacity: s.active ? 1 : 0.5 }}>{s.name}</span>
                    {mod && <>
                      <Switch checked={s.active} onChange={(v) => run(() => api(`/categories/${s.id}`, { method: 'PATCH', body: { active: v } }), v ? 'Sous-catégorie affichée' : 'Sous-catégorie masquée')} label={s.active ? 'Masquer' : 'Afficher'} />
                      <button className="btn plain" onClick={() => setEdit({ parentId: c.id, c: s })}>Modifier</button>
                      <button className="btn plain" onClick={() => run(() => api(`/categories/${s.id}`, { method: 'DELETE' }), 'Sous-catégorie supprimée')}>Supprimer</button>
                    </>}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && <EditDialog parentId={edit.parentId} c={edit.c} onClose={() => setEdit(null)} onSaved={(t) => { setTree(t); setEdit(null); }} />}
    </>
  );
}

function EditDialog({ parentId, c, onClose, onSaved }: { parentId: string | null; c?: Category; onClose: () => void; onSaved: (t: Category[]) => void }) {
  const toast = useToast();
  const [name, setName] = useState(c?.name ?? '');
  const [order, setOrder] = useState(String(c?.sortOrder ?? 100));
  const [error, setError] = useState('');
  const save = async () => {
    try {
      const body = { name: name.trim(), sortOrder: Number(order) || 100, ...(c ? {} : { parentId }) };
      onSaved(await api<Category[]>(c ? `/categories/${c.id}` : '/categories', { method: c ? 'PATCH' : 'POST', body }));
      toast(c ? 'Catégorie modifiée' : 'Catégorie ajoutée');
    } catch (e) {
      setError(errText(e));
    }
  };
  return (
    <Modal title={c ? 'Modifier la catégorie' : parentId ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'} onClose={onClose}
      footer={<><button className="btn secondary" onClick={onClose}>Annuler</button><button className="btn" disabled={!name.trim()} onClick={save}>Enregistrer</button></>}>
      <Field label="Nom"><input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Ordre d’affichage" hint="Plus petit = plus haut"><input inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value.replace(/\D/g, ''))} /></Field>
      {error && <div className="alert error">{error}</div>}
    </Modal>
  );
}
