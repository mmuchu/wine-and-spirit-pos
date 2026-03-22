 // src/lib/services/licenseService.ts
import { createClient } from "@/lib/supabase/client";

export const licenseService = {
  /**
   * Checks if the provided license key is valid for this specific organization.
   */
  async validateLicense(organizationId: string | null) {
    const supabase = createClient();
    
    // 1. Get the Key from Environment Variables (Set in Vercel)
    const providedKey = process.env.NEXT_PUBLIC_LICENSE_KEY;

    if (!providedKey) {
      return { isValid: false, message: "License Key Missing" };
    }
    if (!organizationId) {
      return { isValid: false, message: "Shop ID Missing" };
    }

    // 2. Check Database
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', providedKey)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error("License check DB error", error);
      return { isValid: false, message: "Database Error" };
    }

    if (!data) {
      return { isValid: false, message: "Invalid Key for this Shop" };
    }

    return { isValid: true, message: "Licensed" };
  }
};