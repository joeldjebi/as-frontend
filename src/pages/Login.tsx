import { FormEvent, useState } from 'react';
import { api, errText, setToken, User } from '../api';
import { BrandMark, PhoneInput } from '../ui';

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ token: string; user: User }>('/auth/admin/login', { method: 'POST', body: { phone, password } });
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
        <h1>Adjamé-Smart</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>Back-office de l’équipe</p>
        <form onSubmit={submit}>
          <PhoneInput value={phone} onChange={setPhone} label="Téléphone" autoComplete="username" />
          <input type="password" placeholder="Mot de passe" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="alert error">{error}</div>}
          <button className="btn lg" type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        </form>
      </div>
    </div>
  );
}
