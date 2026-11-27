import { ChangeEvent, useEffect, useState } from 'react';
import { api, errText, photoUrl, uploadPhoto } from '../api';
import { Card, Field, Icon, PageHeader, Segmented, Switch, useToast } from '../ui';
import { DAYS, MyShop } from './types';

/** Ma boutique : présentation, horaires, ouverture, photos, paiement avant livraison, encaissement */
export default function ShopSettings({ shop, onSaved }: { shop: MyShop; onSaved: () => void }) {
  const toast = useToast();
  const [description, setDescription] = useState(shop.description ?? '');
  const [phone, setPhone] = useState((shop.phone ?? '').replace(/^\+225/, ''));
  const [isOpen, setIsOpen] = useState(shop.isOpen);
  const [open, setOpen] = useState(shop.hours?.open ?? '08:00');
  const [close, setClose] = useState(shop.hours?.close ?? '18:00');
  const [days, setDays] = useState<number[]>(shop.hours?.days ?? [1, 2, 3, 4, 5, 6]);
  const [logoUrl, setLogoUrl] = useState(shop.logoUrl);
  const [storefrontUrl, setStorefrontUrl] = useState(shop.storefrontUrl);
  const [prepay, setPrepay] = useState(String(shop.prepayPercent ?? 100));
  const [payout, setPayout] = useState<'PLATFORM' | 'DIRECT'>(shop.payoutMode ?? 'PLATFORM');
  const [alias, setAlias] = useState(shop.pispiAlias ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDescription(shop.description ?? ''); setPhone((shop.phone ?? '').replace(/^\+225/, '')); setIsOpen(shop.isOpen);
    setOpen(shop.hours?.open ?? '08:00'); setClose(shop.hours?.close ?? '18:00'); setDays(shop.hours?.days ?? [1, 2, 3, 4, 5, 6]);
    setLogoUrl(shop.logoUrl); setStorefrontUrl(shop.storefrontUrl); setPrepay(String(shop.prepayPercent ?? 100));
    setPayout(shop.payoutMode ?? 'PLATFORM'); setAlias(shop.pispiAlias ?? '');
  }, [shop]);

  const pick = (set: (u: string) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      set(await uploadPhoto(f));
    } catch (err) {
      toast(errText(err));
    }
  };

  const save = async () => {
    if (shop.canDirectPayout && payout === 'DIRECT' && !alias.trim()) return toast('Indiquez votre alias PI-SPI pour être payé directement');
    if (!days.length) return toast('Choisissez au moins un jour d’ouverture');
    setBusy(true);
    try {
      await api(`/shops/mine/${shop.id}`, {
        method: 'PATCH',
        body: {
          description: description.trim(), ...(phone.replace(/\D/g, '') ? { phone: phone.replace(/\D/g, '') } : {}), isOpen,
          hours: { open, close, days: [...days].sort() }, ...(logoUrl ? { logoUrl } : {}), ...(storefrontUrl ? { storefrontUrl } : {}),
          prepayPercent: Number(prepay), ...(shop.canDirectPayout ? { pispiAlias: alias.trim(), payoutMode: payout } : {}),
        },
      });
      toast('Boutique enregistrée');
      onSaved();
    } catch (e) {
      toast(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const photo = (label: string, url: string | null, set: (u: string) => void, wide = false) => (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {url ? <img src={`${photoUrl(url)}?w=480`} alt={label} style={{ width: wide ? 160 : 72, height: 72, objectFit: 'cover', borderRadius: 12 }} /> : <span style={{ width: wide ? 160 : 72, height: 72, borderRadius: 12, background: 'var(--fill)' }} />}
        <label className="btn secondary"><Icon name="camera" size={15} />Changer<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick(set)} /></label>
      </div>
    </Field>
  );

  return (
    <>
      <PageHeader title="Ma boutique" subtitle="Modifications visibles tout de suite par les clients." actions={<button className="btn" disabled={busy} onClick={save}><Icon name="check" size={15} />Enregistrer</button>} />
      <Card title="Présentation" pad>
        <div className="form-grid">
          <Field label="Nom" hint="Pour le changer, contactez Adjamé-Smart"><input value={shop.name} disabled /></Field>
          <Field label="Emplacement" hint="Validé par l’équipe"><input value={[shop.market, shop.location].filter(Boolean).join(' · ')} disabled /></Field>
          <Field label="Téléphone de la boutique"><input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 01 02 03 04" /></Field>
          <Field label="Ouverture"><div className="sw-row"><Switch checked={isOpen} onChange={setIsOpen} label="Boutique ouverte" /><span>{isOpen ? 'Ouverte : les clients peuvent commander' : 'Fermée pour le moment'}</span></div></Field>
        </div>
        <Field label="Description"><textarea rows={3} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Ce que vous vendez, vos points forts…" /></Field>
        <div className="form-grid">
          {photo('Logo', logoUrl, setLogoUrl)}
          {photo('Photo de la devanture', storefrontUrl, setStorefrontUrl, true)}
        </div>
      </Card>
      <Card title="Horaires" pad>
        <div className="form-grid">
          <Field label="Ouvre à"><input type="time" value={open} onChange={(e) => setOpen(e.target.value)} /></Field>
          <Field label="Ferme à"><input type="time" value={close} onChange={(e) => setClose(e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {DAYS.map((d, i) => {
            const n = i + 1;
            const on = days.includes(n);
            return <button key={d} type="button" className={`btn ${on ? '' : 'secondary'}`} onClick={() => setDays(on ? days.filter((x) => x !== n) : [...days, n])}>{d}</button>;
          })}
        </div>
      </Card>
      <Card title="Paiement des clients" pad>
        <div className="form-grid">
          <Field label="Paiement avant livraison" hint="Valeur par défaut de vos produits ; modifiable produit par produit">
            <select value={prepay} onChange={(e) => setPrepay(e.target.value)}>
              <option value="100">Totalité à la commande</option>
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((n) => <option key={n} value={n}>Acompte {n} %, le reste à la livraison</option>)}
            </select>
          </Field>
          {shop.canDirectPayout && (
            <Field label="Encaissement des ventes">
              <Segmented<'PLATFORM' | 'DIRECT'> value={payout} onChange={setPayout} options={[['PLATFORM', 'Via Adjamé-Smart'], ['DIRECT', 'Directement']]} />
            </Field>
          )}
          {shop.canDirectPayout && payout === 'DIRECT' && <Field label="Votre alias PI-SPI" hint="Numéro Mobile Money où les clients vous paient"><input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="07 01 02 03 04" /></Field>}
        </div>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 13 }}>
          {shop.canDirectPayout && payout === 'DIRECT'
            ? 'Le client vous paie directement. Vous confirmez la réception dans « Commandes » : la livraison VITE part aussitôt.'
            : 'Les clients paient Adjamé-Smart, qui vérifie et confirme chaque paiement pour vous (la livraison part aussitôt), puis vous reverse le montant. Vous n’avez rien à confirmer.'}
        </p>
      </Card>
    </>
  );
}
