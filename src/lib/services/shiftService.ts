 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  getCurrentShift: async (organizationId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error("Error fetching current shift:", error);
      return null;
    }
    return data;
  },

  getShiftSales: async (shiftId: string, openedAt: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('shift_id', shiftId)
      .eq('status', 'completed');

    if (error) return 0;
    return data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
  },

  openShift: async (organizationId: string, openingCash: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current stock levels for snapshot
    const { data: products } = await supabase
      .from('products')
      .select('id, stock')
      .eq('organization_id', organizationId);
    
    const openingStock: Record<string, number> = {};
    products?.forEach(p => openingStock[p.id] = p.stock);

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        organization_id: organizationId,
        user_id: user?.id,
        status: 'active',
        opening_cash: openingCash,
        opening_stock: openingStock,
        opened_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  closeShift: async (shiftId: string, closingCash: number, closingStock: Record<string, number>, notes?: string) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_cash: closingCash,
        closing_stock: closingStock,
        notes: notes
      })
      .eq('id', shiftId);

    if (error) throw error;
    return true;
  }
};