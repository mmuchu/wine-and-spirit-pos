 // src/lib/types.ts

export interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  cost_price?: number;
  stock: number;
  min_stock?: number;
  category_id?: string;
  categories?: { name: string };
  is_active?: boolean;
  organization_id?: string;
  created_at?: string;
}

// NEW: Extends Product with quantity for the cart
export interface CartItem extends Product {
  quantity: number;
}