 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

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
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Check if ID exists in user metadata
        let orgId = user.user_metadata?.organization_id;
        
        // 2. AUTO-FIX: If missing, find or create it
        if (!orgId) {
          console.log("Organization ID missing. Attempting auto-fix...");
          
          // A. Try to find an existing organization (Single shop logic)
          const { data: existingOrgs } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

          if (existingOrgs && existingOrgs.length > 0) {
            orgId = existingOrgs[0].id;
            console.log("Found existing org:", orgId);
          } else {
            // B. If no org exists, create one
            const { data: newOrg } = await supabase
              .from('organizations')
              .insert({ name: 'My Shop' })
              .select()
              .single();
            
            if (newOrg) {
              orgId = newOrg.id;
                console.log("Created new org:", orgId);
            }
          }

          // C. Save it to the user so we don't have to do this again
          if (orgId) {
            await supabase.auth.updateUser({
              data: { organization_id: orgId }
            });
          }
        }

        // 3. Set the state
        if (orgId) {
          setOrganizationId(orgId);
          setUserRole('admin'); // Default to admin for owner
        }

      } catch (error) {
        console.error("Error in OrganizationContext:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);