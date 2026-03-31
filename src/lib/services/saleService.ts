 // src/lib/services/saleService.ts
import { createClient } from "@/lib/supabase/client";
import { auditService } from "./auditService";

export const saleService = {

  processSale: async (orgId: string, shiftId: string | null, cartItems: any[], totalAmount: number, paymentMethod: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // STEP A: Create the "Header" record for the sale FIRST
    // We do this so we get the actual sale.id to attach to our items
    const { data: saleHeader, error: headerError } = await supabase
      .from('sales')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        shift_id: shiftId,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        status: 'completed'
      })
      .select()
      .single();

    if (headerError) {
      console.error("Error creating sale header:", headerError);
      throw headerError;
    }

    // STEP B: Loop through cart and process items atomically via RPC
    for (const item of cartItems) {
      const { error: itemError } = await supabase.rpc('process_single_sale_item', {
        p_sale_id: saleHeader.id,
        p_product_id: item.product_id,
        p_qty: item.quantity,
        p_price: item.price
      });

      // If the RPC fails (e.g., out of stock), we throw an error.
      // Because the RPC failed, the sale_items row was NOT created.
      if (itemError) {
        console.error(`Failed to process item ${item.name}:`, itemError.message);
        
        // OPTIONAL BUT RECOMMENDED: 
        // Since we created the sale header but failed the items, you might want 
        // to delete the empty header so it doesn't pollute your database.
        await supabase.from('sales').delete().eq('id', saleHeader.id);

        // Throw the error back to the frontend (e.g., "Insufficient stock for Coffee")
        throw new Error(itemError.message); 
      }
    }

    // STEP C: Log the audit trail
    await auditService.log(
      'SALE_COMPLETED',
      `Processed sale for Ksh ${totalAmount}`,
      orgId,
      { sale_id: saleHeader.id, item_count: cartItems.length }
    );

    return saleHeader;
  }
};