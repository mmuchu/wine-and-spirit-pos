// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface QueuedSale {
  id?: number;
  payload: any;
  status: 'pending' | 'failed';
  createdAt: Date;
}

export class POSDatabase extends Dexie {
  products!: Table<any, string>;
  salesQueue!: Table<QueuedSale, number>;

  constructor() {
    super('POSOfflineDB');
    this.version(1).stores({
      products: 'id, updatedAt',
      salesQueue: '++id, status, createdAt'
    });
  }
}

export const db = new POSDatabase();
