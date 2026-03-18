 // src/lib/services/stockService.ts
import { createClient } from "@/lib/supabase/client";

export const stockService = {
  
  /**
   * Adds stock to a product and logs the movement.
   * Used when receiving inventory from suppliers.
   */
  async addStock(productId: string, quantity: number, organizationId: string, notes?: string) {
    const supabase = createClient();
    
    try {
      // 1. Log the movement first (for reporting/history)
      const { error: logError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          quantity: quantity,
          type: 'purchase',
          notes: notes || 'Stock In',
          organization_id: organizationId
        });

      if (logError) throw logError;

      // 2. Update the product stock atomically using RPC
      // This prevents race conditions if two people add stock at once
      const { error: rpcError } = await supabase.rpc('increment_stock', {
        p_id: productId,
        qty: quantity
      });

      if (rpcError) {
        // If RPC fails, we might want to delete the log, but for now we throw
        throw rpcError;
      }

    } catch (err: any) {
      console.error("Stock Service Error:", err);
      throw new Error(err.message || "Failed to add stock");
    }
  },

  /**
   * Deducts stock (used internally by sales process).
   * Usually called via RPC 'process_sale', but exposed here if needed.
   */
  async deductStock(productId: string, quantity: number) {
    const supabase = createClient();
    
    const { error } = await supabase.rpc('decrement_stock', {
      p_id: productId,
      qty: quantity
    });

    if (error) throw error;
  },

  // ==========================================
  // REPORTING HELPERS FOR DAILY STOCK RETURN
  // ==========================================

  /**
   * Gets the current stock levels for all products.
   * Used to determine "Actual Stock" at the end of the day.
   */
  async getStockSnapshot(organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('id, stock')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    const snapshot: Record<string, number> = {};
    data?.forEach((p: any) => {
      snapshot[p.id] = p.stock;
    });
    return snapshot;
  },

  /**
   * Calculates how many items were sold in a specific time range.
   * Used for "Sales" column in report.
   */
  async getSalesCountInRange(organizationId: string, startTime: string, endTime: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('items')
      .eq('organization_id', organizationId)
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
  
  /**
   * Calculates how many items were purchased/received in a specific time range.
   * Used for "Purchases" column in report.
   */
  async getPurchasesCountInRange(organizationId: string, startTime: string, endTime: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stock_movements')
      .select('product_id, quantity')
      .eq('organization_id', organizationId)
      .eq('type', 'purchase')
      .gte('created_at', startTime)
      .lte('created_at', endTime);

    if (error) throw error;

    const counts: Record<string, number> = {};
    data?.forEach((mov: any) => {
      counts[mov.product_id] = (counts[mov.product_id] || 0) + mov.quantity;
    });
    return counts;
  },

  // Shift specific helpers (keeping your existing logic)
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
  }
};