 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrgContextType {
  organizationId: string | null;
  userRole: string | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrgContextType>({
  organizationId: null,
  userRole: null,
  loading: true,
});

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // ==============================================
        // ULTIMATE SAFETY NET
        // If you are this user, you ARE the admin.
        // ==============================================
        const MASTER_USER_ID = 'ea6cf402-8116-4440-9d40-446454366071';
        const MASTER_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

        if (user.id === MASTER_USER_ID) {
          console.log("Master User recognized. Granting Admin access.");
          setOrganizationId(MASTER_ORG_ID);
          setUserRole('admin');
          setLoading(false);
          return;
        }

        // --- Normal Flow for other users ---
        
        // 1. Check Metadata
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role;

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role || 'cashier');
          setLoading(false);
          return;
        }

        // 2. Fallback: Check DB
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .single();

        if (member?.organization_id) {
          setOrganizationId(member.organization_id);
          setUserRole(member.role || 'cashier');
        } else {
          // No org found
          setOrganizationId(null);
          setUserRole(null);
        }
      } catch (err) {
        console.error("Org Context Error:", err);
      } finally {
        setLoading(false);
      }
    };

    // Safety Timeout
    const timeout = setTimeout(() => {
      console.warn("Context timeout - forcing load end");
      setLoading(false);
    }, 2000);

    loadOrg().then(() => clearTimeout(timeout));
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);