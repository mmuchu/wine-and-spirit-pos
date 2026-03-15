 // src/lib/types.ts

export interface Product {
  id: string;
  organization_id?: string;
  category_id?: string;
  name: string;
  price: number;
  sku?: string | null;
  stock: number;
  image_url?: string | null;
  is_active: boolean;
  categories?: { name: string };
  phone?: string | null; // <--- Added for M-Pesa records
}

export type CartItem = Product & { quantity: number };