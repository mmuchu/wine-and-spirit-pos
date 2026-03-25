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
          setOrganizationId(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // MASTER USER HARDCODE (LIVE FIX)
        const MASTER_USER_ID = 'ea6cf402-8116-4440-9d40-446454366071';
        if (user.id === MASTER_USER_ID) {
          console.log("Master User Detected. Setting Admin.");
          setOrganizationId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
          setUserRole('admin');
          setLoading(false);
          return;
        }

        // Normal Flow
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role || 'cashier'; 
        
        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role);
        } else {
          const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .single();
          
          if (member?.organization_id) {
            setOrganizationId(member.organization_id);
            setUserRole(member.role || 'cashier');
          } else {
            setOrganizationId(null);
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error("Error loading organization", err);
        setOrganizationId(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    // SAFETY HATCH: Ensure loading ends after 3 seconds no matter what
    const timeout = setTimeout(() => {
        console.warn("Org context timeout - forcing load end");
        setLoading(false);
    }, 3000);

    loadOrg().then(() => clearTimeout(timeout));
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);