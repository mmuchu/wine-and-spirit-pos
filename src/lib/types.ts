 // src/lib/types.ts

export interface CategoryJoin {
    name: string;
  }
  
  export interface Product {
    id: string;
    organization_id: string;
    category_id: string | null;
    name: string;
    price: number;
    sku: string | null;
    stock: number;
    image_url: string | null;
    is_active: boolean;
    // Supabase join returns object, array, or null
    categories: CategoryJoin | CategoryJoin[] | null;
  }
  
  export interface CartItem extends Product {
    quantity: number;
  }
  
  export interface SaleItem {
    id: string;
    name: string;
    price: number;
    sku: string | null;
    quantity: number;
  }