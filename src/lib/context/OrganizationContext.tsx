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
        // SUPER ADMIN BYPASS (HARDCODED EMAIL)
        // ============================================================
        const ADMIN_EMAIL = 'admin@kenyanspirit.com';
        const MASTER_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        if (user.email === ADMIN_EMAIL) {
          console.log("ADMIN ACCESS GRANTED VIA EMAIL");
          setOrganizationId(MASTER_ORG_ID);
          setUserRole('admin');
          setIsLicenseValid(true);
          setLoading(false);
          return;
        }
        // ============================================================

        // NORMAL USER FLOW
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role;

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role || 'admin');
          setIsLicenseValid(true);
          setLoading(false);
          return;
        }

        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.organization_id) {
          setOrganizationId(member.organization_id);
          setUserRole(member.role || 'admin');
          setIsLicenseValid(true);
        } else {
          setOrganizationId(null);
          setUserRole(null);
        }
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