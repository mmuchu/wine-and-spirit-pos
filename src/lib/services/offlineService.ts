 // src/lib/services/offlineService.ts
import { createClient } from "@/lib/supabase/client";
import { db, QueuedSale } from "@/lib/db";
import { Product } from "@/lib/types";

export const offlineService = {
  // 1. DOWNLOAD: Pull products from Supabase to Local DB
  async syncProducts() {
    const supabase = createClient();
    
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_active', true);
    
    // If error, THROW it so the UI can catch it
    if (error) {
      console.error("Supabase Sync Error:", error);
      throw error;
    }

    // Save to Local DB
    if (data) {
      await db.products.clear();
      // Add a timestamp for sync
      const timestamped = data.map((p: any) => ({ ...p, updatedAt: Date.now() }));
      await db.products.bulkAdd(timestamped);
      console.log(`Synced ${data.length} products locally`);
    }
  },

  // ... (rest of the file remains the same as before)
  
  // 2. UPLOAD: Try to send sale to Supabase, or queue if offline
  async processSale(salePayload: any) {
    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('sales').insert(salePayload).select('id').single();
        if (error) throw error;
        
        await this.updateLocalInventory(salePayload.items);
        return { success: true, offline: false, id: data.id };
      } catch (err) {
        console.warn("Online failed, falling back to offline queue", err);
      }
    }

    // OFFLINE MODE
    const queueItem: QueuedSale = {
      payload: salePayload,
      status: 'pending',
      createdAt: new Date()
    };
    const id = await db.salesQueue.add(queueItem);
    await this.updateLocalInventory(salePayload.items);
    
    return { success: true, offline: true, id: `local-${id}` };
  },

  async syncPendingSales() {
    if (!navigator.onLine) return;
    const pending = await db.salesQueue.where('status').equals('pending').toArray();
    if (pending.length === 0) return;
    
    const supabase = createClient();
    for (const item of pending) {
      try {
        const { error } = await supabase.from('sales').insert(item.payload);
        if (error) throw error;
        await db.salesQueue.update(item.id!, { status: 'synced' });
      } catch (err) {
        console.error(`Sync failed for sale ${item.id}`, err);
      }
    }
  },

  async updateLocalInventory(items: any[]) {
    for (const item of items) {
      const product = await db.products.get(item.id);
      if (product) {
        await db.products.update(item.id, {
          stock: Math.max(0, product.stock - item.quantity)
        });
      }
    }
  },

  async getLocalProducts(): Promise<Product[]> {
    return await db.products.toArray() as Product[];
  },

  async getPendingCount(): Promise<number> {
    return await db.salesQueue.where('status').equals('pending').count();
  }
};