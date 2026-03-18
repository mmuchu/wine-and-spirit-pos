 // src/lib/services/stockService.ts
import { createClient } from "@/lib/supabase/client";
import { auditService } from "./auditService";

export const stockService = {
  
  /**
   * Internal helper to log stock movements (Critical Data)
   */
  async _logMovement(productId: string, quantity: number, type: string, notes: string, organizationId: string) {
    const supabase = createClient();
    await supabase.from('stock_movements').insert({
      product_id: productId,
      quantity: quantity,
      type: type,
      notes: notes,
      organization_id: organizationId
    });
  },

  /**
   * Add stock (Purchases)
   * Optimized: Does NOT wait for Audit Log.
   */
  async addStock(productId: string, quantity: number, organizationId: string, notes?: string) {
    const supabase = createClient();
    
    try {
      // 1. Get Product Name (Await - needed for UI confirmation)
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      // 2. Log to Stock Movements (Await - Critical for reports)
      await this._logMovement(productId, quantity, 'purchase', notes || 'Stock In', organizationId);

      // 3. Update Product Stock (Await - Critical for inventory)
      const { error: rpcError } = await supabase.rpc('increment_stock', {
        p_id: productId,
        qty: quantity
      });

      if (rpcError) throw rpcError;

      // 4. Audit Trail (NON-BLOCKING)
      // We call .log() but DO NOT await it. The UI returns success immediately.
      auditService.log(
        'STOCK_ADDED', 
        `Added ${quantity} units of ${product?.name || 'Product'}`,
        { 
          entity_type: 'Product', 
          entity_id: productId, 
          organization_id: organizationId,
          metadata: { quantity, notes } 
        }
      );

    } catch (err: any) {
      console.error("Stock Service Error:", err);
      throw new Error(err.message || "Failed to add stock");
    }
  },

  /**
   * Deduct stock (Sales)
   * Optimized: Does NOT wait for Audit Log.
   */
  async deductStock(productId: string, quantity: number, organizationId: string, reason?: string) {
    const supabase = createClient();

    try {
      // 1. Get Product Name
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      // 2. Update DB (Await - Critical)
      const { error: rpcError } = await supabase.rpc('decrement_stock', {
        p_id: productId,
        qty: quantity
      });

      if (rpcError) throw rpcError;

      // 3. Audit Trail (NON-BLOCKING)
      auditService.log(
        'STOCK_REMOVED', 
        `Sold/Removed ${quantity} units of ${product?.name || 'Product'}`,
        { 
          entity_type: 'Product', 
          entity_id: productId, 
          organization_id: organizationId,
          metadata: { quantity, reason } 
        }
      );

    } catch (err: any) {
      console.error("Deduct Stock Error:", err);
      // Re-throw if critical, ignore if just log error
      throw err;
    }
  },

  // ==========================================
  // REPORTING HELPERS (Read-Only)
  // ==========================================

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