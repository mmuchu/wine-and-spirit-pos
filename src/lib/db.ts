 // src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface QueuedSale {
  id?: number;
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  createdAt: Date;
}

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  min_stock: number; // ADDED
  category_id: string | null;
  categories: { name: string } | null;
  image_url: string | null;
  sku: string | null;
  is_active: boolean;
  organization_id: string;
  updatedAt: number;
}

export class POSDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  salesQueue!: Table<QueuedSale, number>;

  constructor() {
    super('POSDatabase');
    this.version(1).stores({
      products: 'id, updatedAt',
      salesQueue: '++id, status, createdAt'
    });
  }
}

export const db = new POSDatabase();