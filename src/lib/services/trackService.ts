// src/lib/services/trackService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  getCurrentShift: async (organizationId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  startShift: async (organizationId: string, openingCash: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("shifts")
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        opening_cash: openingCash,
        status: "open",
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  closeShift: async (shiftId: string, closingCash: number) => {
    const supabase = createClient();

    const updatePayload = {
      end_time: new Date().toISOString(),
      closing_cash: closingCash,
      status: "closed",
    };

    // FIX: Added missing assignment and await keyword
    const { data, error } = await supabase
      .from("shifts")
      .update(updatePayload)
      .eq("id", shiftId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getShiftSummary: async (shiftId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("payment_method, total_amount")
      .eq("shift_id", shiftId);

    if (error) throw error;

    let cashSales = 0;
    let mpesaSales = 0;
    let transactionCount = 0;

    data?.forEach((order: any) => {
      transactionCount++;
      if (order.payment_method === "cash") cashSales += order.total_amount;
      else if (order.payment_method === "mpesa") mpesaSales += order.total_amount;
    });

    return { cashSales, mpesaSales, transactionCount };
  },

  getShiftOpeningCash: async (shiftId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("shifts")
      .select("opening_cash")
      .eq("id", shiftId)
      .single();

    if (error) throw error;
    return data?.opening_cash || 0;
  },
};
