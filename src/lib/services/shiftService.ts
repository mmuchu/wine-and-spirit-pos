 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  async getCurrentShift() {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'active')
      .order('opened_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error("Error fetching current shift", error);
      return null;
    }
    
    return data;
  },

  async openShift(openingCash: number) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const orgId = user?.user_metadata?.organization_id;
    
    if (!orgId) throw new Error("Organization ID missing");

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        organization_id: orgId,
        user_id: user?.id,
        opening_cash: openingCash,
        status: 'active',
        opened_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async closeShift(shiftId: string, closingCash: number, closingStock: Record<string, number>, notes: string) {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('shifts')
      .update({
        status: 'closed',
        closing_cash: closingCash,
        closing_stock: closingStock,
        notes: notes,
        closed_at: new Date().toISOString()
      })
      .eq('id', shiftId);

    if (error) throw error;
  },

  // ADD THIS FUNCTION
  async getShiftHistory(organizationId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('opened_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};