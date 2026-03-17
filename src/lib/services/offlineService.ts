 // src/lib/services/offlineService.ts
import { createClient } from "@/lib/supabase/client";
import { db, QueuedSale } from "@/lib/db";
import { Product } from "@/lib/types";

export const offlineService = {
  async syncProducts() {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true);
      
      if (error) throw error;

      if (data) {
        await db.products.clear();
        const timestamped = data.map((p: any) => ({ 
          ...p, 
          min_stock: p.min_stock || 10, 
          updatedAt: Date.now() 
        }));
        await db.products.bulkAdd(timestamped);
        console.log(`Synced ${data.length} products locally`);
      }
    } catch (err) {
      console.error("Failed to sync products", err);
    }
  },

  async processSale(salePayload: any) {
    const isOnline = navigator.onLine;

    // NEW: Calculate Cost of Goods Sold (COGS)
    let totalCogs = 0;
    if (salePayload.items && Array.isArray(salePayload.items)) {
        totalCogs = salePayload.items.reduce((sum: number, item: any) => {
            const cost = item.cost_price || 0; 
            return sum + (cost * item.quantity);
        }, 0);
    }
    
    // Add COGS to the sale record
    const finalPayload = {
        ...salePayload,
        cogs_amount: totalCogs
    };

    if (isOnline) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('sales').insert(finalPayload).select('id').single();
        if (error) throw error;
        
        await this.updateLocalInventory(salePayload.items);
        return { success: true, offline: false, id: data.id };
      } catch (err) {
        console.warn("Online failed, falling back to offline queue", err);
      }
    }

    const queueItem: QueuedSale = {
      payload: finalPayload,
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

    console.log(`Syncing ${pending.length} pending sales...`);

    const supabase = createClient();
    
    for (const item of pending) {
      try {
        const { error } = await supabase.from('sales').insert(item.payload);
        if (error) throw error;
        
        await db.salesQueue.update(item.id!, { status: 'synced' });
        console.log(`Sale ${item.id} synced.`);
      } catch (err) {
        console.error(`Failed to sync sale ${item.id}`, err);
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
    const data = await db.products.toArray();
    return data.map(p => ({
        ...p,
        min_stock: p.min_stock || 10
    })) as Product[];
  },

  async getPendingCount(): Promise<number> {
    return await db.salesQueue.where('status').equals('pending').count();
  }
};