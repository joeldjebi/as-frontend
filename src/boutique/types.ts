import { ShopStatus } from '../api';

/** Boutique du vendeur (/shops/mine) */
export interface MyShop {
  id: string; name: string; slug: string; type: 'BOUTIQUE' | 'GROSSISTE'; status: ShopStatus; description: string | null;
  phone: string | null; market: string | null; location: string | null; logoUrl: string | null; storefrontUrl: string | null;
  hours: { open: string; close: string; days: number[] } | null; isOpen: boolean; reviewNote: string | null;
  prepayPercent: number; payoutMode: 'DIRECT' | 'PLATFORM'; pispiAlias: string | null; categoryIds: string[]; canDirectPayout: boolean;
}

export interface Variant { id?: string; label: string; price: number | null; stock: number | null }

/** Produit vu par son vendeur (/products/mine) */
export interface MyProduct {
  id: string; shopId: string; categoryId: string; name: string; description: string | null; photos: string[]; price: number;
  wholesalePrice: number | null; wholesaleMinQty: number | null; stock: number | null; variants: Variant[];
  status: 'ACTIVE' | 'INACTIVE' | 'REMOVED'; moderationNote: string | null; views: number; totalStock: number | null;
  prepayPercent: number | null; reports: number; createdAt: string;
}

export const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
