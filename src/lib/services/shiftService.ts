 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";
import { stockService } from "./stockService";

export const shiftService = {
  
  async getCurrentShift() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async openShift(openingCash: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const openingStock = await stockService.getStockSnapshot();

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        user_id: user.id,
        user_email: user.email, 
        opening_cash: openingCash,
        status: 'open',
        opening_stock: openingStock,
        organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(shiftId: string, closingCash: number, closingStock: Record<string, number>, varianceNotes?: string) {
    const supabase = createClient();
    
    const { data: shiftData, error: fetchError } = await supabase
      .from('shifts')
      .select('opening_stock')
      .eq('id', shiftId)
      .single();

    if (fetchError) throw fetchError;

    const openingStock = shiftData.opening_stock || {};
    const stockVariance: Record<string, number> = {};
    
    Object.keys(closingStock).forEach(productId => {
      const opening = openingStock[productId] || 0;
      const closing = closingStock[productId] || 0;
      stockVariance[productId] = closing - opening;
    });

    const { data, error } = await supabase
      .from('shifts')
      .update({
        closing_cash: closingCash,
        closing_stock: closingStock,
        stock_variance: stockVariance,
        variance_notes: varianceNotes,
        closed_at: new Date().toISOString(),
        status: 'closed'
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    
    const updates = Object.entries(closingStock).map(([id, qty]) => 
      supabase.from('products').update({ stock: qty }).eq('id', id)
    );
    await Promise.all(updates);

    return data;
  },

  async getShiftSales(shiftId: string, openedAt: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sales")
      .select("total_amount")
      .eq("payment_method", "Cash")
      .eq("status", "completed")
      .gte("created_at", openedAt);

    if (error) throw error;
    
    // FIX: Added explicit types to reduce parameters
    return data?.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0) || 0;
  },

  async getShiftHistory() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('id, opened_at, closed_at, opening_cash, closing_cash, status, user_email')
      .eq('status', 'closed')
      .order('opened_at', { ascending: false })
      .limit(30);
    
    if (error) throw error;
    return data;
  },

  async getShiftDetails(shiftId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();
    
    if (error) throw error;
    return data;
  }
};