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

        // =======================================================
        // MASTER ADMIN (GOD MODE)
        // =======================================================
        const MASTER_USER_ID = 'ea6cf402-8116-4440-9d40-446454366071';
        const MASTER_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        if (user.id === MASTER_USER_ID) {
          console.log("Owner Access Granted");
          setOrganizationId(MASTER_ORG_ID);
          setUserRole('owner'); // IMPORTANT: Set to 'owner' for Super Admin privileges
          setIsLicenseValid(true);
          setLoading(false);
          return;
        }

        // =======================================================
        // NORMAL TENANT FLOW
        // =======================================================
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role;

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role || 'cashier');
          await checkLicense(orgId);
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
          setUserRole(member.role || 'cashier');
          await checkLicense(member.organization_id);
          await supabase.auth.updateUser({ data: { organization_id: member.organization_id, role: member.role } });
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

    const checkLicense = async (orgId: string) => {
      try {
        const { data } = await supabase.from('settings').select('license_expires_at').eq('organization_id', orgId).maybeSingle();
        if (!data || !data.license_expires_at) setIsLicenseValid(true);
        else setIsLicenseValid(new Date(data.license_expires_at) > new Date());
      } catch { setIsLicenseValid(true); }
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