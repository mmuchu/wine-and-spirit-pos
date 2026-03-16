 // src/lib/services/stockService.ts
import { createClient } from "@/lib/supabase/client";

export const stockService = {
  
  async getStockSnapshot() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('id, stock');
    
    if (error) throw error;
    
    const snapshot: Record<string, number> = {};
    // FIX: Added : any to parameter p
    data?.forEach((p: any) => {
      snapshot[p.id] = p.stock;
    });
    return snapshot;
  },

  async getSalesCountInRange(startTime: string, endTime: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('items')
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach((sale: any) => {
      const items = sale.items as any[];
      items?.forEach((item: any) => {
        counts[item.id] = (counts[item.id] || 0) + item.quantity;
      });
    });
    return counts;
  },

  async getPurchasesCountInRange(startTime: string, endTime: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stock_movements')
      .select('product_id, quantity')
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach((mov: any) => {
      counts[mov.product_id] = (counts[mov.product_id] || 0) + mov.quantity;
    });
    return counts;
  },
  
  async getShiftSalesCount(shiftOpenedAt: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('items')
      .gte('created_at', shiftOpenedAt);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((sale: any) => {
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
    data?.forEach((mov: any) => {
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