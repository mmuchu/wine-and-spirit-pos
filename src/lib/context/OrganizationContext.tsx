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
        // Set a timeout to avoid hanging
        const timeout = setTimeout(() => {
          if (!organizationId) setLoading(false);
        }, 2000); // Fail after 2s

        const { data: { user } } = await supabase.auth.getUser();
        
        clearTimeout(timeout);

        if (!user) {
          setOrganizationId(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // MASTER USER FAILSAFE (Instant for you)
        const MASTER_USER_ID = 'ea6cf402-8116-4440-9d40-446454366071';
        if (user.id === MASTER_USER_ID) {
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

    loadOrg();
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);