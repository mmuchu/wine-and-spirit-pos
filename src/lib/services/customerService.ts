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

  // Accept organizationId as argument
  async addCustomer(name: string, phone?: string, organizationId?: string) {
    const supabase = createClient();
    
    const cleanPhone = phone && phone.trim() !== "" ? phone.trim() : null;

    const { data, error } = await supabase
      .from('customers')
      .insert({ 
        name, 
        phone: cleanPhone,
        organization_id: organizationId || null 
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async recordDebt(customerId: string, saleId: string, amount: number) {
    const supabase = createClient();
    
    const { error: debtError } = await supabase
      .from('debts')
      .insert({
        customer_id: customerId,
        sale_id: saleId,
        amount_due: amount,
        status: 'unpaid'
      });
      
    if (debtError) throw debtError;

    const { error: rpcError } = await supabase.rpc('increment_customer_balance', {
      c_id: customerId,
      amt: amount
    });
    
    if (rpcError) throw rpcError;
  }
};