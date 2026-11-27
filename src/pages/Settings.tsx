import { useEffect, useState } from 'react';
import { api, dateTime, errText } from '../api';
import { Badge, Card, Field, Icon, PageHeader, Switch, useToast } from '../ui';

type Key = 'LETO_API_URL' | 'LETO_API_KEY' | 'LETO_WEBHOOK_SECRET' | 'AS_PISPI_ALIAS' | 'AS_PISPI_NAME' | 'DIRECT_PAYOUT_ALL';
interface Item { value: string | null; set: boolean; hint: string | null; source: 'backoffice' | 'env' | 'none'; updatedAt?: string; updatedBy?: string | null }
interface Data { settings: Record<Key, Item>; webhookUrl: string }

const SOURCE: Record<Item['source'], [string, string]> = {
  backoffice: ['Back-office', 'green'],
  env: ['Fichier du serveur', 'gray'],
  none: ['Non renseigné', 'orange'],
};

/** Super Admin : livraison VITE (adresse, clé, secret) et encaissement Adjamé-Smart */
export default function Settings() {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [form, setForm] = useState<Partial<Record<Key, string>>>({});
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<null | { ok: boolean; text: string }>(null);

  const load = () => api<Data>('/admin/settings').then((d) => {
    setData(d);
    setForm({ LETO_API_URL: d.settings.LETO_API_URL.value ?? '', AS_PISPI_ALIAS: d.settings.AS_PISPI_ALIAS.value ?? '', AS_PISPI_NAME: d.settings.AS_PISPI_NAME.value ?? '' });
  }).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      // Les secrets ne sont envoyés que s'ils ont été saisis (sinon on garde l'actuel)
      const body: Partial<Record<Key, string>> = { LETO_API_URL: form.LETO_API_URL ?? '', AS_PISPI_ALIAS: form.AS_PISPI_ALIAS ?? '', AS_PISPI_NAME: form.AS_PISPI_NAME ?? '' };
      if (form.LETO_API_KEY?.trim()) body.LETO_API_KEY = form.LETO_API_KEY.trim();
      if (form.LETO_WEBHOOK_SECRET?.trim()) body.LETO_WEBHOOK_SECRET = form.LETO_WEBHOOK_SECRET.trim();
      const d = await api<Data>('/admin/settings', { method: 'PUT', body });
      setData(d);
      setForm((f) => ({ ...f, LETO_API_KEY: '', LETO_WEBHOOK_SECRET: '' }));
      setTest(null);
      toast('Réglages enregistrés · appliqués immédiatement');
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setTest(null);
    try {
      const r = await api<{ name: string; active: boolean; webhookUrl: string | null }>('/admin/settings/test-leto', { method: 'POST' });
      const hookOk = r.webhookUrl === data?.webhookUrl;
      setTest({ ok: r.active && hookOk, text: `Connecté à VITE en tant que « ${r.name} »${r.active ? '' : ' (partenaire désactivé dans VITE)'}${hookOk ? '' : ` · adresse des notifications à corriger dans VITE : ${data?.webhookUrl}`}` });
    } catch (e) {
      setTest({ ok: false, text: errText(e) });
    }
  };

  const meta = (k: Key) => {
    const s = data?.settings[k];
    if (!s) return null;
    return (
      <small className="muted">
        <Badge color={SOURCE[s.source][1]}>{SOURCE[s.source][0]}</Badge>
        {s.updatedAt && ` modifié le ${dateTime(s.updatedAt)}${s.updatedBy ? ` par ${s.updatedBy}` : ''}`}
      </small>
    );
  };

  const input = (k: Key, placeholder: string, type = 'text') => (
    <input type={type} value={form[k] ?? ''} placeholder={placeholder} autoComplete="off" spellCheck={false} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
  );

  const s = data?.settings;
  return (
    <>
      <PageHeader title="Réglages" subtitle="Livraison VITE et encaissement : appliqués immédiatement, sans toucher au serveur." actions={<button className="btn" disabled={busy || !data} onClick={save}><Icon name="check" size={15} />Enregistrer</button>} />

      <Card title="Livraison VITE (API partenaire)" pad>
        <div className="form-grid">
          <Field label="Adresse de l’API VITE" hint="Normalement https://api.vite.ci">
            {input('LETO_API_URL', 'https://api.vite.ci')}
            {meta('LETO_API_URL')}
          </Field>
          <Field label="Clé du partenaire" hint={s?.LETO_API_KEY.set ? `Enregistrée (se termine par ${s.LETO_API_KEY.hint}). Laissez vide pour la garder.` : 'Créée dans le back-office VITE, page « Partenaires API ».'}>
            {input('LETO_API_KEY', s?.LETO_API_KEY.set ? `•••••••••••• ${s.LETO_API_KEY.hint}` : 'leto_live_…', 'password')}
            {meta('LETO_API_KEY')}
          </Field>
          <Field label="Secret de signature des notifications" hint={s?.LETO_WEBHOOK_SECRET.set ? `Enregistré (se termine par ${s.LETO_WEBHOOK_SECRET.hint}). Laissez vide pour le garder.` : 'Affiché par VITE avec la clé (whsec_…).'}>
            {input('LETO_WEBHOOK_SECRET', s?.LETO_WEBHOOK_SECRET.set ? `•••••••••••• ${s.LETO_WEBHOOK_SECRET.hint}` : 'whsec_…', 'password')}
            {meta('LETO_WEBHOOK_SECRET')}
          </Field>
          <Field label="Adresse des notifications à donner à VITE">
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={data?.webhookUrl ?? ''} />
              <button className="btn secondary" type="button" onClick={() => { navigator.clipboard?.writeText(data?.webhookUrl ?? ''); toast('Adresse copiée'); }}>Copier</button>
            </div>
          </Field>
        </div>
        <div className="li-actions" style={{ marginTop: 14 }}>
          <button className="btn secondary" type="button" onClick={runTest}><Icon name="refresh" size={15} />Tester la connexion</button>
          {test && <span className={test.ok ? 'text-ok' : 'text-warn'}>{test.ok ? '✓ ' : ''}{test.text}</span>}
          <small className="muted grow">Enregistrez d’abord une nouvelle clé avant de la tester.</small>
        </div>
      </Card>

      <Card title="Encaissement via Adjamé-Smart" pad>
        <div className="form-grid">
          <Field label="Alias PI-SPI d’Adjamé-Smart" hint="Numéro ou alias Mobile Money affiché aux clients des boutiques réglées « via Adjamé-Smart ».">
            {input('AS_PISPI_ALIAS', '07 00 00 00 00')}
            {meta('AS_PISPI_ALIAS')}
          </Field>
          <Field label="Nom du bénéficiaire affiché" hint="Par défaut : Adjamé-Smart">
            {input('AS_PISPI_NAME', 'Adjamé-Smart')}
            {meta('AS_PISPI_NAME')}
          </Field>
        </div>
      </Card>
      <Card title="Encaissement direct par les boutiques" pad>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Switch checked={data?.settings.DIRECT_PAYOUT_ALL.value === 'true'} label="Ouvrir à toutes les boutiques" onChange={async (v) => {
            try {
              const d = await api<Data>('/admin/settings', { method: 'PUT', body: { DIRECT_PAYOUT_ALL: v ? 'true' : 'false' } });
              setData(d);
              toast(v ? 'Toutes les boutiques peuvent encaisser directement' : 'Encaissement direct réservé aux boutiques autorisées');
            } catch (e) { toast(errText(e)); }
          }} />
          <div>
            <strong>{data?.settings.DIRECT_PAYOUT_ALL.value === 'true' ? 'Ouvert à toutes les boutiques' : 'Réservé aux boutiques autorisées'}</strong>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>Par défaut, Adjamé-Smart encaisse et confirme tous les paiements. Autorisez une boutique précise depuis sa fiche (Boutiques), ou ouvrez à toutes quand la vérification automatique des paiements sera disponible.</p>
          </div>
        </div>
      </Card>
      <p className="muted" style={{ fontSize: 13 }}>Un champ vidé reprend la valeur du fichier de réglages du serveur (.env). Les clés secrètes ne sont jamais réaffichées.</p>
    </>
  );
}
