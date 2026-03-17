// src/lib/services/quotationService.ts
import { createClient } from "@/lib/supabase/client";

export const quotationService = {
  async saveQuotation(quotation: any) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .insert(quotation)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getQuotations(organizationId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending') // Only show active quotes
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async convertToSale(quotationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('quotations')
      .update({ status: 'converted' })
      .eq('id', quotationId);
    
    if (error) throw error;
  }
};