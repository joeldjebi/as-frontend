import { useEffect, useState } from 'react';
import { api, getToken, setToken, STAFF_LABEL, User } from './api';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Resellers from './pages/Resellers';
import Shops from './pages/Shops';
import Team from './pages/Team';
import { useTheme } from './theme';
import { Avatar, BrandMark, Icon, Segmented, ToastProvider } from './ui';

export type Route = 'overview' | 'orders' | 'shops' | 'products' | 'resellers' | 'customers' | 'categories' | 'team';
const HASH: Record<Route, string> = { overview: '', orders: 'commandes', shops: 'boutiques', products: 'produits', resellers: 'revendeurs', customers: 'clients', categories: 'categories', team: 'equipe' };
const fromHash = (): Route => (Object.entries(HASH).find(([, h]) => h && location.hash.startsWith(`#/${h}`))?.[0] as Route) ?? 'overview';
export const go = (r: Route) => { location.hash = `/${HASH[r]}`; };

export default function App() {
  const [me, setMe] = useState<User | null>(null);
  const [checked, setChecked] = useState(!getToken());
  useEffect(() => {
    if (!getToken()) return;
    api<User>('/auth/me').then(setMe).catch(() => setToken(null)).finally(() => setChecked(true));
  }, []);
  if (!checked) return null;
  return (
    <ToastProvider>
      {me ? <Shell me={me} onLogout={() => { setToken(null); setMe(null); }} /> : <Login onLogin={setMe} />}
    </ToastProvider>
  );
}

function Shell({ me, onLogout }: { me: User; onLogout: () => void }) {
  const [route, setRoute] = useState<Route>(fromHash());
  const [theme, setTheme] = useTheme();
  const [pending, setPending] = useState({ shops: 0, resellers: 0, products: 0, orders: 0 });
  useEffect(() => {
    const on = () => setRoute(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    const load = () => {
      api<{ shopsPending: number; resellersPending: number; productsReported: number }>('/admin/dashboard').then((d) => setPending((p) => ({ ...p, shops: d.shopsPending, resellers: d.resellersPending, products: d.productsReported }))).catch(() => {});
      api<{ counts: { toConfirm: number; toDeliver: number } }>('/orders/admin?status=PAYMENT_DECLARED').then((d) => setPending((p) => ({ ...p, orders: d.counts.toConfirm + d.counts.toDeliver }))).catch(() => {});
    };
    load();
    const t = window.setInterval(load, 30_000);
    window.addEventListener('pending:changed', load);
    return () => { window.clearInterval(t); window.removeEventListener('pending:changed', load); };
  }, []);
  const nav: { section: string; links: { r: Route; icon: string; label: string; count?: number }[] }[] = [
    { section: 'Pilotage', links: [{ r: 'overview', icon: 'overview', label: 'Vue d’ensemble' }] },
    {
      section: 'Marketplace',
      links: [
        { r: 'orders', icon: 'receipt', label: 'Commandes', count: pending.orders || undefined },
        { r: 'shops', icon: 'building', label: 'Boutiques', count: pending.shops || undefined },
        { r: 'products', icon: 'box', label: 'Produits', count: pending.products || undefined },
        { r: 'resellers', icon: 'tag', label: 'Revendeurs', count: pending.resellers || undefined },
        { r: 'customers', icon: 'people', label: 'Clients' },
        { r: 'categories', icon: 'overview', label: 'Catégories' },
      ],
    },
    { section: 'Réglages', links: [{ r: 'team', icon: 'shield', label: 'Équipe' }] },
  ];
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Navigation">
        <div className="brand">
          <div className="app-icon"><BrandMark size={22} /></div>
          <div>
            <strong className="brand-word">Adjamé-Smart</strong>
            <small className="muted">Back-office</small>
          </div>
        </div>
        {nav.map((s) => (
          <div key={s.section}>
            <div className="nav-section">{s.section}</div>
            {s.links.map((l) => (
              <button key={l.r} className={`nav-item${route === l.r ? ' active' : ''}`} onClick={() => go(l.r)} aria-current={route === l.r ? 'page' : undefined}>
                <Icon name={l.icon} size={17} />
                {l.label}
                {l.count != null && <span className="count alert">{l.count}</span>}
              </button>
            ))}
          </div>
        ))}
        <div className="theme-switch" title="Apparence">
          <Segmented value={theme} onChange={setTheme} options={[['auto', <Icon key="a" name="auto" size={15} />], ['light', <Icon key="l" name="sun" size={15} />], ['dark', <Icon key="d" name="moon" size={15} />]]} labels={{ auto: 'Automatique', light: 'Clair', dark: 'Sombre' }} />
        </div>
        <div className="sidebar-footer">
          <Avatar name={me.name} />
          <div className="who">
            <strong>{me.name}</strong>
            <small className="muted">{me.staffRole ? STAFF_LABEL[me.staffRole] : 'Équipe'}</small>
          </div>
          <button className="btn secondary icon-btn" onClick={onLogout} title="Se déconnecter" aria-label="Se déconnecter"><Icon name="logout" size={16} /></button>
        </div>
      </nav>
      <main className="main">
        <div className="page">
          {route === 'overview' && <Overview />}
          {route === 'orders' && <Orders me={me} />}
          {route === 'shops' && <Shops me={me} />}
          {route === 'products' && <Products me={me} />}
          {route === 'resellers' && <Resellers me={me} />}
          {route === 'customers' && <Customers me={me} />}
          {route === 'categories' && <Categories me={me} />}
          {route === 'team' && <Team me={me} />}
        </div>
      </main>
    </div>
  );
}

/** Peut valider, refuser, gérer le catalogue */
export const canModerate = (me: User) => me.staffRole === 'SUPER_ADMIN' || me.staffRole === 'MODERATOR';
