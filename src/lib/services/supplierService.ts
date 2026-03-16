// src/lib/services/supplierService.ts
import { createClient } from "@/lib/supabase/client";

export const supplierService = {
  async getSuppliers() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async addSupplier(supplier: { name: string; contact_person?: string; phone?: string; email?: string }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        ...supplier,
        organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSupplier(id: string, updates: any) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};