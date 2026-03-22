 // src/lib/services/settingsService.ts
import { createClient } from "@/lib/supabase/client";

export const settingsService = {
  async getSettings(organizationId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching settings", error);
      return null;
    }
    
    if (!data) {
      return { 
        shop_name: '', address: '', phone: '', vat_number: '', 
        mpesa_paybill: '', receipt_footer: '', vat_enabled: true 
      };
    }
    
    return data;
  },

  async upsertSettings(organizationId: string, settings: any) {
    const supabase = createClient();
    
    const payload = {
      organization_id: organizationId,
      shop_name: settings.shop_name || '',
      address: settings.address || '',
      phone: settings.phone || '',
      mpesa_paybill: settings.mpesa_paybill || '',
      vat_enabled: settings.vat_enabled ?? true,
      vat_number: settings.vat_number || '',
      receipt_footer: settings.receipt_footer || ''
    };

    // ROBUST LOGIC: Check if row exists first
    // 1. Try to find existing row
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    let error;
    if (existing) {
      // 2. If exists, UPDATE it
      const result = await supabase
        .from('settings')
        .update(payload)
        .eq('id', existing.id);
      error = result.error;
    } else {
      // 3. If not, INSERT it
      const result = await supabase
        .from('settings')
        .insert(payload);
      error = result.error;
    }

    if (error) throw error;
  }
};