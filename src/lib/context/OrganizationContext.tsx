 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrgContextType {
  organizationId: string | null;
  userRole: string | null;
  loading: boolean;
  isLicenseValid: boolean;
}

const OrganizationContext = createContext<OrgContextType>({
  organizationId: null,
  userRole: null,
  loading: true,
  isLicenseValid: true, // Default true to avoid flashing lock screen
});

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLicenseValid, setIsLicenseValid] = useState(true);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLicenseValid(true);
          setLoading(false);
          return;
        }

        // 1. Check Metadata (Fastest)
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role;

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role || 'admin');
          await checkLicense(orgId);
          setLoading(false);
          return;
        }

        // 2. Check organization_members table
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.organization_id) {
          setOrganizationId(member.organization_id);
          setUserRole(member.role || 'admin');
          
          // Save to metadata for speed
          await supabase.auth.updateUser({
            data: { organization_id: member.organization_id, role: member.role }
          });
          
          await checkLicense(member.organization_id);
        } else {
          // No org found
          setOrganizationId(null);
          setUserRole(null);
          setIsLicenseValid(false);
        }
      } catch (err) {
        console.error("Org Context Error:", err);
      } finally {
        setLoading(false);
      }
    };

    // --- LICENSE CHECKER ---
    const checkLicense = async (orgId: string) => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('license_expires_at')
          .eq('organization_id', orgId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
           // No settings row? Let them in (fail open)
           setIsLicenseValid(true);
           return;
        }

        if (!data.license_expires_at) {
          // NULL date = Lifetime Access (One-off sale)
          setIsLicenseValid(true);
        } else {
          // Has date = Check if expired
          const isExpired = new Date(data.license_expires_at) < new Date();
          setIsLicenseValid(!isExpired);
        }

      } catch (err) {
        console.error("License check failed", err);
        setIsLicenseValid(true); // Fail open on error
      }
    };

    // Safety Timeout
    const timeout = setTimeout(() => {
      console.warn("Context timeout");
      setLoading(false);
    }, 5000);

    loadOrg().then(() => clearTimeout(timeout));
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading, isLicenseValid }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);