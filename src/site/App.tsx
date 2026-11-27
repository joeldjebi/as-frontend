import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, authPrompt, cart, cartTotals, errText, go, refreshMe, session, setTheme, theme, thumb, toasts, useRoute, User, useStore } from './core';
import Account from './pages/Account';
import Cart from './pages/Cart';
import Catalog from './pages/Catalog';
import Checkout from './pages/Checkout';
import Home from './pages/Home';
import { OrderDetail, Orders } from './pages/Orders';
import ProductPage from './pages/Product';
import { Departments, ShopPage, Shops } from './pages/Shops';
import { catIcon, Icon, Modal } from './ui';

export default function App() {
  const { parts, query } = useRoute();
  useEffect(() => { refreshMe(); }, []);
  const [a, b] = parts;
  let page;
  if (!a) page = <Home />;
  else if (a === 'rayons') page = <Departments />;
  else if (a === 'rayon' || a === 'recherche' || a === 'selection' || a === 'marche') page = <Catalog kind={a} arg={b} query={query} />;
  else if (a === 'produit' && b) page = <ProductPage id={b} />;
  else if (a === 'boutiques') page = <Shops />;
  else if (a === 'boutique' && b) page = <ShopPage slug={b} />;
  else if (a === 'panier') page = <Cart />;
  else if (a === 'commande' && b) page = <OrderDetail id={b} />;
  else if (a === 'commande') page = <Checkout />;
  else if (a === 'commandes') page = <Orders />;
  else if (a === 'compte') page = <Account />;
  else page = <Home />;
  return (
    <>
      <Header active={a ?? ''} />
      <main className="wrap" key={parts.join('/') + query.toString()}>{page}</main>
      <footer className="foot">
        <div className="wrap">
          <span className="brand" style={{ fontSize: 15 }}><span className="mark" style={{ width: 24, height: 24, fontSize: 14, borderRadius: 7 }}>A</span><span>Adjamé<span className="smart">Smart</span></span></span>
          <span>Le marché d’Adjamé, livré par VITE.</span>
          <span className="sp" />
          <a href="../">Présentation</a>
          <a href="../adjame-smart.apk" download="Adjame-Smart.apk">App Android</a>
          <a href="https://boutique.vite.ci">Espace boutique</a>
          <a href="https://pixabay.com" target="_blank" rel="noreferrer">Photos de démonstration : Pixabay</a>
        </div>
      </footer>
      <TabBar active={a ?? ''} />
      <AuthModal />
      <Toaster />
    </>
  );
}

function ThemeButton() {
  const t = useStore(theme);
  const next = t === 'auto' ? 'light' : t === 'light' ? 'dark' : 'auto';
  const label = { auto: 'Apparence : automatique', light: 'Apparence : claire', dark: 'Apparence : sombre' }[t];
  return <button className="icon-btn" onClick={() => setTheme(next)} title={label} aria-label={`${label}. Changer`}><Icon name={t === 'auto' ? 'auto' : t === 'light' ? 'sun' : 'moon'} /></button>;
}

interface Suggest { categories: { id: string; name: string; icon: string | null; parentName: string | null }[]; shops: { id: string; slug: string; name: string; market: string | null; logoUrl: string | null }[]; products: { id: string; name: string; price: number; photo: string | null }[] }

function SearchBox() {
  const [q, setQ] = useState('');
  const [s, setS] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (q.trim().length < 2) { setS(null); return; }
    const t = setTimeout(() => api<Suggest>(`/products/suggest?q=${encodeURIComponent(q.trim())}`).then(setS).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const on = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, []);
  const submit = (e: FormEvent) => { e.preventDefault(); if (q.trim()) { setOpen(false); go(`/recherche?q=${encodeURIComponent(q.trim())}`); } };
  const pick = (to: string) => { setOpen(false); setQ(''); go(to); };
  const has = s && (s.categories.length || s.shops.length || s.products.length);
  return (
    <div className="search" ref={box}>
      <Icon name="search" size={18} />
      <form onSubmit={submit}><input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Produits, boutiques, rayons" aria-label="Rechercher" /></form>
      {open && q.trim().length >= 2 && (
        <div className="suggest">
          <button className="row" onClick={() => pick(`/recherche?q=${encodeURIComponent(q.trim())}`)}><Icon name="search" size={18} /><span>Rechercher « {q.trim()} »</span></button>
          {has && s!.categories.length > 0 && <div className="grp">Rayons</div>}
          {s?.categories.map((c) => <button key={c.id} className="row" onClick={() => pick(`/rayon/${c.id}`)}><Icon name={catIcon(c.icon)} size={18} /><span>{c.name}{c.parentName && <small className="muted"> · {c.parentName}</small>}</span></button>)}
          {has && s!.shops.length > 0 && <div className="grp">Boutiques</div>}
          {s?.shops.map((b) => <button key={b.id} className="row" onClick={() => pick(`/boutique/${b.slug}`)}>{b.logoUrl ? <img src={thumb(b.logoUrl, 240)} alt="" /> : <span className="ph" />}<span>{b.name}<small className="muted"> · {b.market}</small></span></button>)}
          {has && s!.products.length > 0 && <div className="grp">Produits</div>}
          {s?.products.map((p) => <button key={p.id} className="row" onClick={() => pick(`/produit/${p.id}`)}>{p.photo ? <img src={thumb(p.photo, 240)} alt="" /> : <span className="ph" />}<span style={{ flex: 1 }}>{p.name}</span></button>)}
        </div>
      )}
    </div>
  );
}

function Header({ active }: { active: string }) {
  const items = useStore(cart);
  const { user } = useStore(session);
  const n = cartTotals(items).count;
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="#/" aria-label="Adjamé-Smart, accueil de la boutique"><span className="mark">A</span><span className="word">Adjamé<span className="smart">Smart</span></span></a>
        <SearchBox />
        <nav className="nav" aria-label="Navigation">
          <a className={`link${active === 'rayons' || active === 'rayon' ? ' on' : ''}`} href="#/rayons">Rayons</a>
          <a className={`link${active === 'boutiques' || active === 'boutique' ? ' on' : ''}`} href="#/boutiques">Boutiques</a>
          {user && <a className={`link${active === 'commandes' || (active === 'commande') ? ' on' : ''}`} href="#/commandes">Mes commandes</a>}
          <ThemeButton />
          <a className="icon-btn" href="#/panier" aria-label={`Panier, ${n} article(s)`}><Icon name="bag" />{n > 0 && <span className="badge">{n}</span>}</a>
          <a className="icon-btn" href="#/compte" aria-label={user ? `Compte de ${user.name}` : 'Se connecter'}><Icon name="user" /></a>
        </nav>
      </div>
    </header>
  );
}

function TabBar({ active }: { active: string }) {
  const n = cartTotals(useStore(cart)).count;
  const tab = (href: string, icon: string, label: string, on: boolean, badge = 0) => (
    <a href={href} className={on ? 'on' : ''}><Icon name={icon} size={21} />{label}{badge > 0 && <span className="badge">{badge}</span>}</a>
  );
  return (
    <nav className="tabbar" aria-label="Onglets">
      {tab('#/', 'home', 'Accueil', !active)}
      {tab('#/rayons', 'grid', 'Rayons', active === 'rayons' || active === 'rayon')}
      {tab('#/boutiques', 'store', 'Boutiques', active === 'boutiques' || active === 'boutique')}
      {tab('#/panier', 'bag', 'Panier', active === 'panier', n)}
      {tab('#/compte', 'user', 'Compte', ['compte', 'commandes', 'commande'].includes(active))}
    </nav>
  );
}

function Toaster() {
  const t = useStore(toasts);
  return t ? <div className="toast" role="status"><Icon name="check" size={18} />{t.text}</div> : null;
}

/** Connexion / inscription : même compte que l'app mobile */
function AuthModal() {
  const prompt = useStore(authPrompt);
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!prompt) return null;
  const close = () => { authPrompt.set(null); setError(''); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (register && !name.trim()) return setError('Indiquez votre nom');
    if (digits.length !== 10) return setError('Numéro à 10 chiffres (ex. 07 01 02 03 04)');
    if (password.length < 6) return setError('Mot de passe : 6 caractères minimum');
    setBusy(true);
    setError('');
    try {
      const r = await api<{ token: string; user: User }>(register ? '/auth/register' : '/auth/login', { method: 'POST', body: register ? { name: name.trim(), phone: digits, password } : { phone: digits, password } });
      session.set({ token: r.token, user: r.user });
      await refreshMe();
      const then = prompt.then;
      authPrompt.set(null);
      setPassword('');
      then?.();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal onClose={close}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn link" onClick={close}>Annuler</button></div>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 30, fontWeight: 700, margin: '0 auto 12px' }}>A</div>
      <h2>{register ? 'Créez votre compte' : 'Bon retour parmi nous'}</h2>
      <p className="sub">{prompt.reason}</p>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={!register ? 'on' : ''} onClick={() => setRegister(false)}>Connexion</button>
        <button className={register ? 'on' : ''} onClick={() => setRegister(true)}>Inscription</button>
      </div>
      <form onSubmit={submit}>
        <div className="group">
          {register && <div className="field"><label htmlFor="n">Nom</label><input id="n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom et prénom" autoComplete="name" /></div>}
          <div className="field"><label htmlFor="p">Téléphone</label><span className="muted">+225</span><input id="p" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 01 02 03 04" autoComplete="tel-national" /></div>
          <div className="field"><label htmlFor="w">Mot de passe</label><input id="w" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={register ? '6 caractères minimum' : 'Requis'} autoComplete={register ? 'new-password' : 'current-password'} /></div>
        </div>
        <p className="gfoot">{register ? 'Le même compte fonctionne dans l’app Adjamé-Smart.' : 'Vous avez l’app ? Utilisez le même numéro et le même mot de passe.'}</p>
        {error && <div className="banner orange"><Icon name="info" /><p>{error}</p></div>}
        <button className="btn block" style={{ marginTop: 18 }} disabled={busy}>{busy ? 'Un instant…' : register ? 'Créer mon compte' : 'Se connecter'}</button>
      </form>
    </Modal>
  );
}

