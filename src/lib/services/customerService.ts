 // src/lib/services/customerService.ts
import { createClient } from "@/lib/supabase/client";

export const customerService = {
  async getCustomers(organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      console.error("Error fetching customers", error);
      return [];
    }
    return data;
  },

  async addCustomer(name: string, phone: string, organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name,
        phone,
        organization_id: organizationId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async searchCustomers(query: string, organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Error searching customers", error);
      return [];
    }
    return data;
  }
};