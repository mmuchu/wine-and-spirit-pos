 // src/lib/types.ts

export interface Product {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  price: number;
  sku: string | null;
  stock: number;
  min_stock: number;
  image_url: string | null;
  is_active: boolean;
  categories: { name: string } | null;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  organization_id: string;
}

// ADDED: Shift Interface
export interface Shift {
  id: string;
  opened_at: string;
  closed_at?: string;
  opening_cash: number;
  closing_cash?: number;
  status: 'open' | 'closed';
  user_id?: string;
  user_email?: string;
  organization_id?: string;
  opening_stock?: Record<string, number>;
  closing_stock?: Record<string, number>;
  stock_variance?: Record<string, number>;
  variance_notes?: string;
}