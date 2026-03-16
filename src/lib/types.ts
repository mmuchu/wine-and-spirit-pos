 // src/lib/types.ts

export interface Product {
  id: string;
  organization_id: string;
  category_id: string | null;
  name: string;
  price: number;
  sku: string | null;
  stock: number;
  min_stock: number; // Added for Low Stock Alerts
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