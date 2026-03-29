 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";
import { auditService } from "./auditService";

export const shiftService = {
  
  getCurrentShift: async (organizationId: string): Promise<any> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching current shift:", error.message);
      return null;
    }
    return data;
  },

  getShiftSales: async (shiftId: string, openedAt: string): Promise<any> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('shift_id', shiftId)
      .gte('created_at', openedAt)
      .order('created_at', { ascending: false });
      
    if (error) console.error("Error fetching shift sales:", error);
    return data || [];
  },

  openShift: async (organizationId: string, openingCash: number): Promise<any> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      organization_id: organizationId,
      user_id: user?.id,
      opening_cash: openingCash,
      status: 'active',
    };

    const { data, error } = await supabase.from('shifts').insert(payload).select().single();
    if (error) {
      console.error("Error opening shift:", error);
      throw error;
    }

    // ---> ADDED: AUDIT LOG FOR OPENING SHIFT <---
    await auditService.log(
      'SHIFT_OPENED', 
      `Started shift with Ksh ${openingCash}`, 
      organizationId, 
      { opening_cash: openingCash, shift_id: data.id }
    );
    // -------------------------------------------

    return data;
  },

  closeShift: async (shiftId: string, closingCash: number, closingStock: Record<string, any>, notes?: string): Promise<any> => {
    const supabase = createClient();

    const updateData = {
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_cash: closingCash,
      closing_stock: closingStock,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', shiftId)
      .select().single();

    if (error) {
      console.error("Error closing shift:", error);
      throw error;
    }

    // ---> ADDED: AUDIT LOG FOR CLOSING SHIFT <---
    await auditService.log(
      'SHIFT_CLOSED', 
      `Closed shift. Cash: Ksh ${closingCash}`, 
      null, // organizationId isn't passed in this function signature, so we leave it null or fetch it if needed
      { closing_cash: closingCash, notes: notes, shift_id: shiftId }
    );
    // -------------------------------------------

    return data;
  }
};