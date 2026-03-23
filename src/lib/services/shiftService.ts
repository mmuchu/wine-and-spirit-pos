 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  async getCurrentShift(organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("Error fetching shift:", error);
      return null;
    }
    return data;
  },

  // CALLED WHEN STARTING A SHIFT
  async openShift(organizationId: string, openingCash: number = 0) {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // 1. Get Current Stock Levels (The Snapshot)
    const { data: products } = await supabase
        .from('products')
        .select('id, stock');
        
    // Format: { 'product-id': 10, 'product-id-2': 5 }
    const openingStockMap: Record<string, number> = {};
    products?.forEach(p => {
        openingStockMap[p.id] = p.stock || 0;
    });

    // 2. Create Shift with Snapshot
    const { data, error } = await supabase
      .from("shifts")
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        opening_cash: openingCash,
        opening_stock: openingStockMap, // SNAPSHOT
        status: "active"
      })
      .select()
      .single();

    if (error) {
      console.error("SHIFT START ERROR:", error);
      throw error;
    }

    return data;
  },

  // CALLED WHEN CLOSING A SHIFT
  async closeShift(shiftId: string, closingCash: number, closingStock: any, notes: string) {
    const supabase = createClient();
    
    // 1. Get Current Stock Levels (Closing Snapshot)
    const { data: products } = await supabase
        .from('products')
        .select('id, stock');

    const closingStockMap: Record<string, number> = {};
    products?.forEach(p => {
        closingStockMap[p.id] = p.stock || 0;
    });

    const { data, error } = await supabase
      .from("shifts")
      .update({
        closing_cash: closingCash,
        closing_stock: closingStockMap, // SNAPSHOT
        notes: notes,
        status: "closed",
        closed_at: new Date().toISOString()
      })
      .eq("id", shiftId)
      .select();

    if (error) {
      console.error("SHIFT CLOSE ERROR:", error);
      throw error;
    }
    
    return data;
  }
};