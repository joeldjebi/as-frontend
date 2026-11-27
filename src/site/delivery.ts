/** Types de livraison VITE proposés au client (engin × délai) */
/** Engin : MOTO, CAR, CARGO ou un engin ajouté dans VITE (VELO, TRICYCLE…) */
export type Vehicle = string;
export interface VehicleInfo { code: string; name: string; icon: string; description: string }
export type Speed = 'EXPRESS' | 'STANDARD' | 'SCHEDULED';
export interface DeliveryOption { vehicleType: Vehicle; speed: Speed; price: number }

export const VEHICLES: Record<string, { label: string; hint: string }> = {
  MOTO: { label: 'Moto', hint: 'Petits colis' },
  CAR: { label: 'Voiture', hint: 'Colis moyens ou fragiles' },
  CARGO: { label: 'Cargo', hint: 'Gros volumes' },
};

export const SPEEDS: Record<Speed, { label: string; hint: string }> = {
  EXPRESS: { label: 'Express', hint: 'Livreur dédié à votre commande' },
  STANDARD: { label: 'Standard', hint: 'Le livreur peut passer par une autre adresse sur sa route' },
  SCHEDULED: { label: 'Dans 2 heures', hint: 'Le moins cher' },
};

/** Nom d'un engin : celui de VITE s'il est connu, sinon le nom d'origine, sinon le code mis en forme */
export const vehicleName = (code: string, list?: VehicleInfo[]) =>
  list?.find((x) => x.code === code)?.name ?? VEHICLES[code]?.label ?? code.charAt(0) + code.slice(1).toLowerCase();
export const vehicleHint = (code: string, list?: VehicleInfo[]) =>
  list?.find((x) => x.code === code)?.description || VEHICLES[code]?.hint || '';

export const deliveryLabel = (v?: string | null, s?: string | null, name?: string | null) =>
  [name || vehicleName(v ?? 'MOTO'), SPEEDS[(s ?? 'STANDARD') as Speed]?.label].filter(Boolean).join(' · ');
