 // src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface QueuedSale {
  id?: number;
  payload: any;
  status: 'pending' | 'synced' | 'failed';
  createdAt: Date;
}

// NEW: Interface for queued expenses
export interface QueuedExpense {
  id?: number;
  payload: any; // The expense object to be synced
  status: 'pending' | 'synced' | 'failed';
  createdAt: Date;
}

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  min_stock: number; 
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
  expensesQueue!: Table<QueuedExpense, number>; // NEW: Table for offline expenses

  constructor() {
    super('POSDatabase');
    
    // IMPORTANT: Version bumped to 2 to add the new expensesQueue table
    this.version(2).stores({
      products: 'id, updatedAt',
      salesQueue: '++id, status, createdAt',
      expensesQueue: '++id, status, createdAt' // NEW: Schema for expenses
    });
  }
}

export const db = new POSDatabase();