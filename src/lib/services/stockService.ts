 // src/lib/services/stockService.ts
import { createClient } from "@/lib/supabase/client";

export const stockService = {
  async addStock(details: {
    productId: string;
    quantity: number;
    organizationId: string;
    shiftId?: string;
    // Text fields from Inventory
    supplierName?: string;
    contactPerson?: string;
    supplierPhone?: string;
    invoiceNo?: string;
    unitCost?: number;
    notes?: string;
  }) {
    const supabase = createClient();
    
    let supplierId: string | undefined = undefined;

    // --- AUTO-SAVE SUPPLIER LOGIC ---
    if (details.supplierName && details.organizationId) {
      // 1. Check if supplier already exists (Case insensitive)
      const { data: existing, error: fetchError } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', details.organizationId)
        .ilike('name', details.supplierName) 
        .maybeSingle();

      if (fetchError) console.error("Check supplier error", fetchError);

      if (existing) {
        // 2a. Found it! Use existing ID
        supplierId = existing.id;
      } else {
        // 2b. Not found. Create new supplier now.
        const { data: newSupplier, error: createError } = await supabase
          .from('suppliers')
          .insert({
            organization_id: details.organizationId,
            name: details.supplierName,
            contact: details.contactPerson || null,
            phone: details.supplierPhone || null
          })
          .select('id')
          .single();

        if (createError) {
          console.error("Create supplier error", createError);
        } else if (newSupplier) {
          supplierId = newSupplier.id;
          console.log(`✅ Auto-created supplier: ${details.supplierName}`);
        }
      }
    }

    const totalCost = (details.unitCost || 0) * details.quantity;

    // 3. Insert Movement with the ID
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        organization_id: details.organizationId,
        product_id: details.productId,
        quantity: details.quantity,
        type: 'purchase',
        shift_id: details.shiftId,
        supplier_id: supplierId, // Link the ID
        // Also save text for history
        supplier_name: details.supplierName,
        supplier_contact: details.contactPerson,
        supplier_phone: details.supplierPhone,
        invoice_no: details.invoiceNo,
        unit_cost: details.unitCost,
        total_cost: totalCost,
        notes: details.notes || 'Stock Purchase'
      })
      .select();

    if (error) throw error;

    // 4. Update Product Stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock, cost_price')
      .eq('id', details.productId)
      .single();

    if (fetchError) throw fetchError;

    const currentStock = product?.stock || 0;
    const newStock = currentStock + details.quantity;

    const { error: updateError } = await supabase
      .from('products')
      .update({ 
        stock: newStock,
        cost_price: details.unitCost || product?.cost_price
      })
      .eq('id', details.productId);

    if (updateError) throw updateError;

    return data;
  },

  async adjustStock(details: {
    productId: string;
    quantity: number;
    organizationId: string;
    shiftId?: string;
    reason: string;
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

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', details.productId)
      .single();

    if (fetchError) throw fetchError;

    const currentStock = product?.stock || 0;
    const newStock = currentStock + details.quantity;

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
      .select('*, products(name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};