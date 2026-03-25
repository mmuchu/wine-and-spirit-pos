 // src/lib/services/offlineService.ts
const OFFLINE_QUEUE_KEY = "offline_sales_queue";

export const offlineService = {
  // Check if online
  isOnline: () => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },

  // Add sale to local queue
  queueSale: (saleData: any) => {
    if (typeof window === "undefined") return;
    
    const queue = offlineService.getQueue();
    const newSale = {
      ...saleData,
      id: `offline_${Date.now()}`,
      created_at: new Date().toISOString(),
      status: "pending_sync"
    };
    
    queue.push(newSale);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    
    return newSale;
  },

  // Get current queue
  getQueue: (): any[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Remove sale from queue after successful sync
  removeSale: (tempId: string) => {
    if (typeof window === "undefined") return;
    const queue = offlineService.getQueue();
    const newQueue = queue.filter((s) => s.id !== tempId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
  },

  // Process queue (Sync to DB)
  syncQueue: async (supabase: any, organizationId: string) => {
    const queue = offlineService.getQueue();
    
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const sale of queue) {
      try {
        // 1. Insert Sale
        const { id, ...dbData } = sale;
        const { error: saleError } = await supabase.from("sales").insert({
          ...dbData,
          status: 'completed',
          organization_id: organizationId
        });

        if (saleError) throw saleError;

        // 2. Update Stock for each item in that sale
        for (const item of sale.items) {
           // Use standard decrement logic
           const { data: p } = await supabase.from('products').select('stock').eq('id', item.id).single();
           if (p) {
             await supabase.from('products').update({ stock: p.stock - item.quantity }).eq('id', item.id);
           }
        }

        offlineService.removeSale(sale.id);
        synced++;
      } catch (err) {
        console.error(`Failed to sync sale ${sale.id}`, err);
        failed++;
      }
    }

    return { synced, failed };
  }
};