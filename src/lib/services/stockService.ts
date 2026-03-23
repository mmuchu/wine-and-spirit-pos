 // src/lib/services/stockService.ts
import { createClient } from "@/lib/supabase/client";

export const stockService = {
  // DETAILED STOCK ADDITION (Purchase)
  async addStock(details: {
    productId: string;
    quantity: number;
    organizationId: string;
    shiftId?: string;
    supplierId?: string;
    invoiceNo?: string;
    unitCost?: number; // Important for Moving Average Cost
    notes?: string;
  }) {
    const supabase = createClient();
    
    const totalCost = (details.unitCost || 0) * details.quantity;

    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        organization_id: details.organizationId,
        product_id: details.productId,
        quantity: details.quantity,
        type: 'purchase',
        shift_id: details.shiftId,
        supplier_id: details.supplierId,
        invoice_no: details.invoiceNo,
        unit_cost: details.unitCost,
        total_cost: totalCost,
        notes: details.notes || 'Stock Purchase'
      })
      .select();

    if (error) throw error;

    // OPTIONAL: Update Product Cost Price (Moving Average)
    // If you want the cost price to update automatically:
    if (details.unitCost && details.unitCost > 0) {
        await supabase.rpc('update_product_cost', {
            p_id: details.productId,
            new_qty: details.quantity,
            new_cost: details.unitCost
        });
        // Note: You would need to create the 'update_product_cost' RPC function in SQL for this.
        // For now, we will just update it directly for simplicity.
        await supabase
            .from('products')
            .update({ cost_price: details.unitCost })
            .eq('id', details.productId);
    }

    return data;
  },

  // STOCK ADJUSTMENT (Damage, Loss, Count)
  async adjustStock(details: {
    productId: string;
    quantity: number; // Can be negative
    organizationId: string;
    shiftId?: string;
    reason: string; // 'damage', 'theft', 'stock_take'
    notes?: string;
  }) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        organization_id: details.organizationId,
        product_id: details.productId,
        quantity: details.quantity,
        type: 'adjustment',
        shift_id: details.shiftId,
        notes: `${details.reason}: ${details.notes || ''}`
      })
      .select();

    if (error) throw error;
    return data;
  },

  async getRecentMovements(organizationId: string, limit: number = 10) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name), suppliers(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};