/** Types de livraison VITE proposés au client (engin × délai) */
export type Vehicle = 'MOTO' | 'CAR' | 'CARGO';
export type Speed = 'EXPRESS' | 'STANDARD' | 'SCHEDULED';
export interface DeliveryOption { vehicleType: Vehicle; speed: Speed; price: number }

export const VEHICLES: Record<Vehicle, { label: string; hint: string }> = {
  MOTO: { label: 'Moto', hint: 'Petits colis' },
  CAR: { label: 'Voiture', hint: 'Colis moyens ou fragiles' },
  CARGO: { label: 'Cargo', hint: 'Gros volumes' },
};

export const SPEEDS: Record<Speed, { label: string; hint: string }> = {
  EXPRESS: { label: 'Express', hint: 'Livreur dédié à votre commande' },
  STANDARD: { label: 'Standard', hint: 'Le livreur peut passer par une autre adresse sur sa route' },
  SCHEDULED: { label: 'Dans 2 heures', hint: 'Le moins cher' },
};

export const deliveryLabel = (v?: string | null, s?: string | null) =>
  [VEHICLES[(v ?? 'MOTO') as Vehicle]?.label, SPEEDS[(s ?? 'STANDARD') as Speed]?.label].filter(Boolean).join(' · ');
