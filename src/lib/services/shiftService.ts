 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  async getCurrentShift(organizationId: string | null) {
    if (!organizationId) return null;
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      console.error("Error fetching shift:", error);
      return null;
    }
    
    return data;
  },

  async openShift(organizationId: string, openingCash: number = 0) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get current stock levels for snapshot
    const { data: products } = await supabase
      .from('products')
      .select('id, stock')
      .eq('organization_id', organizationId);

    const stockSnapshot: Record<string, number> = {};
    products?.forEach(p => {
      if (p.id) stockSnapshot[p.id] = p.stock || 0;
    });

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        organization_id: organizationId,
        opened_by: user?.id,
        opening_cash: openingCash,
        opening_stock: stockSnapshot,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(shiftId: string, closingCash: number, closingStock: any, notes: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('shifts')
      .update({
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
        closing_cash: closingCash,
        closing_stock: closingStock,
        status: 'closed',
        notes: notes
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // FIX: Added missing function
  async getShiftDetails(shiftId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        profiles ( full_name )
      `)
      .eq('id', shiftId)
      .single();

    if (error) throw error;
    return data;
  }
};