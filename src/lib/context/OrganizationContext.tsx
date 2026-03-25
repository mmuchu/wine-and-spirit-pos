 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setOrganizationId(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        // 2. Check User Metadata (Fastest)
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role || 'cashier'; // Default to cashier
        
        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role);
        } else {
          // 3. Fallback: Query Database
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
  }, [pathname]);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);