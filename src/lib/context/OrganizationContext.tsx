 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { auditService } from "@/lib/services/auditService"; // Import service

interface OrganizationContextType {
  organizationId: string | null;
  userRole: string | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType>({
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
    const init = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        let orgId = user.user_metadata?.organization_id;
        
        if (!orgId) {
          console.log("⚠️ Organization ID missing. Running Safety Net...");

          const { data: existingOrgs } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

          if (existingOrgs && existingOrgs.length > 0) {
            orgId = existingOrgs[0].id;
          } else {
            const { data: newOrg } = await supabase
              .from('organizations')
              .insert({ name: 'My Shop' })
              .select()
              .single();
            
            if (newOrg) {
              orgId = newOrg.id;
            }
          }

          if (orgId) {
            await supabase.auth.updateUser({
              data: { organization_id: orgId }
            });
          }
        }

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole('admin');
          
          // FIX: Log the login/session activity NOW that we have the ID
          auditService.log("USER_SESSION", "User logged in / session started", orgId);
        }

      } catch (error) {
        console.error("Error in OrganizationContext:", error);
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);