// src/lib/services/expenseService.ts
import { createClient } from "@/lib/supabase/client";

export const expenseService = {
  async getExpenses() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addExpense(expense: { description: string; amount: number; category: string; date: string; notes?: string }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        ...expense,
        user_id: user.id,
        organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTotalExpensesThisMonth() {
    const supabase = createClient();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('expenses')
      .select('amount')
      .gte('date', startOfMonth.toISOString());

    if (error) throw error;
    
    return data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  }
};