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
    unitCost?: number;
    notes?: string;
  }) {
    const supabase = createClient();
    
    const totalCost = (details.unitCost || 0) * details.quantity;

    // 1. Insert Movement Record
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

    // 2. CRITICAL: Update the Product Stock Count
    // We need to fetch current stock first to ensure accuracy
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, cost_price')
      .eq('id', details.productId)
      .single();

    if (fetchError) throw fetchError;

    const currentStock = product?.stock || 0;
    const newStock = currentStock + details.quantity;

    // 3. Update Product
    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        stock: newStock,
        cost_price: details.unitCost || product?.cost_price // Update cost if provided
      })
      .eq('id', details.productId);

    if (updateError) throw updateError;

    return data;
  },

  // STOCK ADJUSTMENT (Damage, Loss, Count)
  async adjustStock(details: {
    productId: string;
    quantity: number; // Can be negative
    organizationId: string;
    shiftId?: string;
    reason: string;
    notes?: string;
  }) {
    const supabase = createClient();

    // 1. Insert Movement
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

    // 2. Update Product Stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', details.productId)
      .single();

    if (fetchError) throw fetchError;

    const currentStock = product?.stock || 0;
    const newStock = currentStock + details.quantity; // quantity can be negative

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', details.productId);

    if (updateError) throw updateError;

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