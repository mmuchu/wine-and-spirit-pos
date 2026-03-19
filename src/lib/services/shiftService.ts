// src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  async getCurrentShift(organizationId: string | null) {
    const supabase = createClient();
    if (!organizationId) return null;

    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
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

  async getShiftHistory(organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('opened_at', { ascending: false });

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
  },

  // FIX: Corrected variable name openedAt
  async getShiftSales(shiftId: string, openedAt: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount')
      .gte('created_at', openedAt); // FIX: used openedAt

    if (error) throw error;
    
    const total = data?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
    return total;
  },

  // FIX: Corrected variable name openedAt
  async getShiftPurchases(openedAt: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('type', 'purchase')
      .gte('created_at', openedAt); // FIX: used openedAt

    if (error) throw error;
    
    const total = data?.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0) || 0;
    return total;
  }
};