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


export interface Batch {
  id: string;
  organization_id: string;
  product_id: string;
  batch_code: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  expiry_date: string;
  received_at: string;
  notes?: string;
}

export interface Product {
  // ... existing
  has_expiry?: boolean;
  stock: number;
  cost_price: number; // Current MAC
}