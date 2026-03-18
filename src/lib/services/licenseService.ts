 // src/lib/services/licenseService.ts
import { createClient } from "@/lib/supabase/client";

// Default Org ID as a safety net
const DEFAULT_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export const licenseService = {
  async checkLicense(organizationId: string | null) {
    const supabase = createClient();
    
    // Safety Net: Use default if ID is invalid
    const safeId = organizationId || DEFAULT_ORG_ID;

    const { data, error } = await supabase
      .from('settings')
      .select('license_expires_at')
      .eq('organization_id', safeId)
      .single();

    if (error) {
      console.warn("License check failed, allowing access.", error);
      return { isValid: true, expiresAt: null };
    }

    const expiresAt = new Date(data.license_expires_at);
    const now = new Date();

    return {
      isValid: now < expiresAt,
      expiresAt: data.license_expires_at
    };
  },

  async extendLicense(organizationId: string | null, newDate: string) {
    const supabase = createClient();
    
    const safeId = organizationId || DEFAULT_ORG_ID;
    
    const { error } = await supabase
      .from('settings')
      .update({ license_expires_at: newDate })
      .eq('organization_id', safeId);
    
    if (error) throw error;
  }
};