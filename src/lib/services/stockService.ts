 // src/lib/services/stockService.ts
import { createClient } from "@/lib/supabase/client";

export const stockService = {
  // ... existing methods ...

  // Get stock snapshot (Product ID -> Quantity)
  async getStockSnapshot() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('id, stock');
    
    if (error) throw error;
    
    const snapshot: Record<string, number> = {};
    data?.forEach(p => {
      snapshot[p.id] = p.stock;
    });
    return snapshot;
  },

  // NEW: Get sales counts for a specific time range
  async getSalesCountInRange(startTime: string, endTime: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('items')
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach(sale => {
      const items = sale.items as any[];
      items?.forEach((item: any) => {
        counts[item.id] = (counts[item.id] || 0) + item.quantity;
      });
    });
    return counts;
  },

  // NEW: Get purchases (stock in) for a specific time range
  async getPurchasesCountInRange(startTime: string, endTime: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stock_movements')
      .select('product_id, quantity')
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach(mov => {
      counts[mov.product_id] = (counts[mov.product_id] || 0) + mov.quantity;
    });
    return counts;
  },
  
  // Existing methods used for active shift...
  async getShiftSalesCount(shiftOpenedAt: string) {
    // Used for active shift (from opened_at until now)
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('items')
      .gte('created_at', shiftOpenedAt);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(sale => {
        const items = sale.items as any[];
        items?.forEach((item: any) => {
          counts[item.id] = (counts[item.id] || 0) + item.quantity;
        });
      });
      return counts;
  },

  async getShiftPurchasesCount(shiftOpenedAt: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stock_movements')
      .select('product_id, quantity')
      .gte('created_at', shiftOpenedAt);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach(mov => {
      counts[mov.product_id] = (counts[mov.product_id] || 0) + mov.quantity;
    });
    return counts;
  },

  async addStock(productId: string, quantity: number, notes?: string) {
    const supabase = createClient();
    
    await supabase.from('stock_movements').insert({
      product_id: productId,
      quantity,
      type: 'purchase',
      notes,
      organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    });

    await supabase.rpc('increment_stock', {
      p_id: productId,
      qty: quantity
    });
  }
};