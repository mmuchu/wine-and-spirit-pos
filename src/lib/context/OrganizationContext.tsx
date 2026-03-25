 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

interface OrgContextType {
  organizationId: string | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrgContextType>({
  organizationId: null,
  loading: true,
});

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const pathname = usePathname();
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setOrganizationId(null);
          setLoading(false);
          return;
        }

        // 2. Check User Metadata (Fastest)
        const orgId = user.user_metadata?.organization_id;
        
        if (orgId) {
          setOrganizationId(orgId);
        } else {
          // 3. Fallback: Query Database (Safety Net)
          const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();
          
          if (member?.organization_id) {
            setOrganizationId(member.organization_id);
          } else {
            setOrganizationId(null); // No org found
          }
        }
      } catch (err) {
        console.error("Error loading organization", err);
        setOrganizationId(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrg();
  }, [pathname]); // Re-check on route change just in case

  return (
    <OrganizationContext.Provider value={{ organizationId, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);