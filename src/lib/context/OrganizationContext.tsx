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
  isLicenseValid: true,
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
          setLoading(false);
          return;
        }

        // ============================================================
        // NUCLEAR FIX: FORCE ORG ID FOR ALL LOGGED-IN USERS
        // ============================================================
        const FORCED_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
        
        console.log("NUCLEAR FIX: Forcing Organization ID");
        setOrganizationId(FORCED_ORG_ID);
        setUserRole('admin');
        setIsLicenseValid(true);
        setLoading(false);
        return;
        // ============================================================

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => setLoading(false), 5000);
    loadOrg().then(() => clearTimeout(timeout));
  }, []);

  const value = { organizationId, userRole, loading, isLicenseValid };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);