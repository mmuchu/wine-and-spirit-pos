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

  async startShift(organizationId: string, openingCash: number = 0) {
    const supabase = createClient();
    
    // Get User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    console.log("Starting shift for:", organizationId);

    const { data, error } = await supabase
      .from("shifts")
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        opening_cash: openingCash,
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

  async closeShift(shiftId: string, closingCash: number, closingStock: any, notes: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("shifts")
      .update({
        closing_cash: closingCash,
        closing_stock: closingStock,
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