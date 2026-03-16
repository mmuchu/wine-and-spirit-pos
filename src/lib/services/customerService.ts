 // src/lib/services/customerService.ts
import { createClient } from "@/lib/supabase/client";

export const customerService = {
  async getCustomers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async addCustomer(name: string, phone?: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .insert({ 
        name, 
        phone, 
        organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async recordDebt(customerId: string, saleId: string, amount: number) {
    const supabase = createClient();
    
    // 1. Create the debt record
    const { error: debtError } = await supabase
      .from('debts')
      .insert({
        customer_id: customerId,
        sale_id: saleId,
        amount_due: amount,
        status: 'unpaid',
        organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      });
      
    if (debtError) throw debtError;

    // 2. Update customer balance via RPC (Atomic update)
    const { error: rpcError } = await supabase.rpc('increment_customer_balance', {
      c_id: customerId,
      amount: amount
    });
    
    if (rpcError) throw rpcError;
  },

  // NEW: Record a repayment
  async recordRepayment(customerId: string, amount: number) {
    const supabase = createClient();

    // 1. Reduce customer balance
    const { error: rpcError } = await supabase.rpc('decrement_customer_balance', {
      c_id: customerId,
      amount: amount
    });
    
    if (rpcError) throw rpcError;

    // Note: In a full system, you would also update specific 'debts' rows here.
    // For now, we reduce the total balance.
  }
};