 // src/lib/types.ts

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price?: number; // <--- THE FIX IS HERE
  stock: number;
  min_stock?: number;
  sku?: string;
  is_active?: boolean;
  category_id?: string;
  categories?: { name: string };
  organization_id?: string;
  created_at?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}