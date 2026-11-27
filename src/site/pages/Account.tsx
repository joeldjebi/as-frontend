import { useState } from 'react';
import { api, authPrompt, errText, phoneFmt, refreshMe, session, setTheme, theme, toast, useStore } from '../core';
import { Empty, Icon } from '../ui';
import { AddressModal } from './Checkout';

/** Compte : profil, commandes, adresses, apparence */
export default function Account() {
  const { user, token } = useStore(session);
  const t = useStore(theme);
  const [adding, setAdding] = useState(false);
  if (!token || !user) {
    return <Empty icon="user" title="Votre compte Adjamé-Smart" text="Connectez-vous pour commander et suivre vos livraisons. Le même compte fonctionne dans l’app." action={<button className="btn" onClick={() => authPrompt.set({ reason: 'Connectez-vous pour commander et suivre vos livraisons' })}>Se connecter ou créer un compte</button>} />;
  }
  const remove = async (id: string) => {
    try { await api(`/auth/me/addresses/${id}`, { method: 'DELETE' }); await refreshMe(); toast('Adresse supprimée'); } catch (e) { toast(errText(e)); }
  };
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="page-title">Compte</h1>
      <div className="group on-bg" style={{ marginTop: 14 }}>
        <div className="cell">
          <span style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700 }}>{user.name[0]?.toUpperCase()}</span>
          <div className="grow"><b style={{ fontSize: 17 }}>{user.name}</b><small>{phoneFmt(user.phone)}</small></div>
        </div>
      </div>
      <div className="gtitle">Achats</div>
      <div className="group on-bg">
        <a className="cell" href="#/commandes"><span className="ico" style={{ background: 'var(--primary)' }}><Icon name="bag" size={17} /></span><div className="grow">Mes commandes<small>Paiement et suivi de livraison</small></div><Icon name="chevron" size={16} /></a>
      </div>
      <div className="gtitle">Adresses de livraison</div>
      <div className="group on-bg">
        {user.addresses.map((a) => (
          <div className="cell" key={a.id}>
            <Icon name="pin" />
            <div className="grow">{a.label}<small>{[a.address, a.landmark].filter(Boolean).join(' · ')}</small></div>
            <button className="icon-btn" onClick={() => remove(a.id)} aria-label={`Supprimer ${a.label}`}><Icon name="trash" size={18} /></button>
          </div>
        ))}
        <button className="cell" style={{ color: 'var(--primary)' }} onClick={() => setAdding(true)}><Icon name="plus" /><div className="grow">Ajouter une adresse</div></button>
      </div>
      <div className="gtitle">Apparence</div>
      <div className="group on-bg" style={{ padding: 12 }}>
        <div className="seg">
          {([['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']] as const).map(([k, v]) => <button key={k} className={t === k ? 'on' : ''} onClick={() => setTheme(k)}>{v}</button>)}
        </div>
      </div>
      <div className="gtitle">Vendre sur Adjamé-Smart</div>
      <div className="group on-bg">
        <a className="cell" href="https://boutique.vite.ci"><span className="ico" style={{ background: 'var(--teal)' }}><Icon name="store" size={17} /></span><div className="grow">Espace boutique<small>Gérez vos produits et commandes sur boutique.vite.ci</small></div><Icon name="chevron" size={16} /></a>
        <a className="cell" href="../adjame-smart.apk" download="Adjame-Smart.apk"><span className="ico" style={{ background: 'var(--accent)' }}><Icon name="box" size={17} /></span><div className="grow">Application Android<small>Achetez et vendez depuis votre téléphone</small></div><Icon name="chevron" size={16} /></a>
      </div>
      <div className="group on-bg" style={{ marginTop: 28 }}>
        <button className="cell" style={{ justifyContent: 'center', color: 'var(--warn)' }} onClick={() => { session.set({ token: null, user: null }); toast('Vous êtes déconnecté'); }}>Se déconnecter</button>
      </div>
      {adding && <AddressModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); toast('Adresse ajoutée'); }} />}
    </div>
  );
}
