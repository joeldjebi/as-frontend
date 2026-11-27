import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, API_URL, errText, getToken, setToken, User } from '../api';
import { connectLive, useNotices, useOrdersRefresh } from '../live';
import { useTheme } from '../theme';
import { Avatar, BrandMark, Empty, Icon, NotifyButton, PhoneInput, Segmented, ToastProvider, useToast } from '../ui';
import Dashboard from './Dashboard';
import ShopOrders from './Orders';
import ShopProducts from './Products';
import ShopSettings from './ShopSettings';
import { MyShop } from './types';

type Route = 'dashboard' | 'orders' | 'products' | 'shop';
const HASH: Record<Route, string> = { dashboard: '', orders: 'commandes', products: 'produits', shop: 'boutique' };
const fromHash = (): Route => (Object.entries(HASH).find(([, h]) => h && location.hash.startsWith(`#/${h}`))?.[0] as Route) ?? 'dashboard';
export const goTo = (r: Route) => { location.hash = `/${HASH[r]}`; };
const SHOP_KEY = 'asb_shop';

/** Espace boutique (boutique.vite.ci) : le même compte que dans l'app Adjamé-Smart */
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

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { phone, password } });
      setToken(res.token);
      onLogin(res.user);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <div className="card">
        <div className="app-icon"><BrandMark size={40} /></div>
        <h1>Espace boutique</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>Le même numéro et le même mot de passe que dans l’app Adjamé-Smart</p>
        <form onSubmit={submit}>
          <PhoneInput value={phone} onChange={setPhone} label="Téléphone" autoComplete="username" />
          <input type="password" placeholder="Mot de passe" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="alert">{error}</div>}
          <button className="btn lg" type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        </form>
      </div>
    </div>
  );
}

function Shell({ me, onLogout }: { me: User; onLogout: () => void }) {
  const [route, setRoute] = useState<Route>(fromHash());
  const [theme, setTheme] = useTheme();
  const [shops, setShops] = useState<MyShop[] | null>(null);
  const [shopId, setShopId] = useState<string | null>(localStorage.getItem(SHOP_KEY));
  const [toConfirm, setToConfirm] = useState(0);
  const toast = useToast();

  // Temps réel : connexion pendant la session, fermée à la déconnexion
  useEffect(() => {
    connectLive(API_URL, getToken());
    return () => connectLive(API_URL, null);
  }, [me.id]);
  useOrdersRefresh(() => window.dispatchEvent(new Event('orders:changed')));
  useNotices('shop', (text) => toast(text, 5000), (id) => { location.hash = `/commandes/${id}`; });

  useEffect(() => {
    const on = () => setRoute(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const loadShops = useCallback(() => api<MyShop[]>('/shops/mine').then(setShops).catch(() => setShops([])), []);
  useEffect(() => { loadShops(); }, [loadShops]);

  const shop = shops?.find((s) => s.id === shopId) ?? shops?.[0] ?? null;
  useEffect(() => { if (shop) localStorage.setItem(SHOP_KEY, shop.id); }, [shop]);

  // Pastille « à traiter » : paiements à confirmer par la boutique
  useEffect(() => {
    if (!shop || shop.status !== 'APPROVED') return;
    const load = () => api<{ status: string; payment: { mode: string } }[]>(`/orders/shop?shopId=${shop.id}`)
      .then((o) => setToConfirm(o.filter((x) => x.status === 'PAYMENT_DECLARED' && x.payment.mode === 'DIRECT').length)).catch(() => {});
    load();
    const t = window.setInterval(load, 60_000);
    window.addEventListener('orders:changed', load);
    return () => { window.clearInterval(t); window.removeEventListener('orders:changed', load); };
  }, [shop]);

  const nav: { r: Route; icon: string; label: string; count?: number }[] = [
    { r: 'dashboard', icon: 'overview', label: 'Tableau de bord' },
    { r: 'orders', icon: 'receipt', label: 'Commandes', count: toConfirm || undefined },
    { r: 'products', icon: 'box', label: 'Produits' },
    { r: 'shop', icon: 'building', label: 'Ma boutique' },
  ];

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Navigation">
        <div className="brand">
          <div className="app-icon"><BrandMark size={22} /></div>
          <div>
            <strong className="brand-word">Adjamé-Smart</strong>
            <small className="muted">Espace boutique</small>
          </div>
        </div>
        {shops && shops.length > 1 && (
          <div style={{ padding: '4px 10px 10px' }}>
            <select value={shop?.id} onChange={(e) => setShopId(e.target.value)} aria-label="Boutique">
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="nav-section">{shop?.name ?? 'Ma boutique'}</div>
        {nav.map((l) => (
          <button key={l.r} className={`nav-item${route === l.r ? ' active' : ''}`} onClick={() => goTo(l.r)} aria-current={route === l.r ? 'page' : undefined}>
            <Icon name={l.icon} size={17} />
            {l.label}
            {l.count != null && <span className="count alert">{l.count}</span>}
          </button>
        ))}
        <div className="theme-switch" title="Apparence">
          <Segmented value={theme} onChange={setTheme} options={[['auto', <Icon key="a" name="auto" size={15} />], ['light', <Icon key="l" name="sun" size={15} />], ['dark', <Icon key="d" name="moon" size={15} />]]} labels={{ auto: 'Automatique', light: 'Clair', dark: 'Sombre' }} />
        </div>
        <NotifyButton />
        <div className="sidebar-footer">
          <Avatar name={me.name} />
          <div className="who">
            <strong>{me.name}</strong>
            <small className="muted">Vendeur</small>
          </div>
          <button className="btn secondary icon-btn" onClick={onLogout} title="Se déconnecter" aria-label="Se déconnecter"><Icon name="logout" size={16} /></button>
        </div>
      </nav>
      <main className="main">
        <div className="page">
          {!shops ? <Empty icon="building">Chargement…</Empty> : !shop ? (
            <div className="card" style={{ padding: 32, textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 8px' }}>Pas encore de boutique</h2>
              <p className="muted" style={{ margin: 0 }}>Ouvrez votre boutique depuis l’application Adjamé-Smart : Compte › Ouvrir ma boutique. Une fois votre dossier envoyé, vous la gérez aussi ici.</p>
            </div>
          ) : (
            <>
              {route === 'dashboard' && <Dashboard shop={shop} />}
              {route === 'orders' && <ShopOrders shop={shop} />}
              {route === 'products' && <ShopProducts shop={shop} />}
              {route === 'shop' && <ShopSettings shop={shop} onSaved={loadShops} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
