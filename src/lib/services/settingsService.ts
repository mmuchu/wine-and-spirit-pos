// src/lib/services/settingsService.ts
import { createClient } from "@/lib/supabase/client";

// Singleton cache to avoid repeated DB calls
let cachedSettings: any = null;

export const settingsService = {
  async getSettings() {
    if (cachedSettings) return cachedSettings;
    
    const supabase = createClient();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (error) {
      console.error("Failed to fetch settings", error);
      // Return hardcoded defaults if DB fails
      return {
        shop_name: 'Kenyan Spirit',
        address: 'Nairobi',
        phone: '',
        vat_number: '',
        receipt_footer: 'Thank you!'
      };
    }
    
    cachedSettings = data;
    return data;
  },

  async updateSettings(updates: any) {
    const supabase = createClient();
    const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Hardcoded for now
    
    const { data, error } = await supabase
      .from('settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;
    
    // Update cache
    cachedSettings = data;
    return data;
  }
};