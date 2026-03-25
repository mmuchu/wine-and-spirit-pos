 // src/lib/types.ts
export interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  cost_price?: number; // Optional
  stock: number;
  min_stock?: number;
  category_id?: string;
  organization_id?: string;
  is_active?: boolean;
  categories?: { name: string };
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  payment_method: string;
  status: string;
  shift_id: string;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  quantity: number;
}