 // src/lib/services/settingsService.ts
import { createClient } from "@/lib/supabase/client";

export const settingsService = {
  async getSettings(organizationId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle(); // Use maybeSingle to avoid errors if row doesn't exist yet

    if (error) {
      console.error("Error fetching settings", error);
      return null;
    }
    
    // Return default object if no settings exist yet
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
    
    // Construct the payload explicitly
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

    const { error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'organization_id' });

    if (error) throw error;
  }
};