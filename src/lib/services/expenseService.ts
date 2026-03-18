 // src/lib/services/expenseService.ts
import { createClient } from "@/lib/supabase/client";

export const expenseService = {
  async getTotalExpensesThisMonth() {
    const supabase = createClient();
    
    // Get current user to filter by organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', user.user_metadata?.organization_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .gte('date', startOfMonth);

      if (error) throw error;
      
      return data?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0;
    } catch (err) {
      console.error("Failed to load expenses", err);
      return 0; // Return 0 instead of crashing
    }
  },

  async getExpenses(organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addExpense(expense: any) {
    const supabase = createClient();
    const { error } = await supabase.from('expenses').insert(expense);
    if (error) throw error;
  }
};