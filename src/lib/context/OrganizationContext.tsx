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
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Try to get ID from metadata
        let orgId = user.user_metadata?.organization_id;
        
        // 2. SAFETY NET: If missing, find or create it
        if (!orgId) {
          console.log("⚠️ Organization ID missing. Running Safety Net...");

          // A. Try to find an existing organization
          const { data: existingOrgs } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);

          if (existingOrgs && existingOrgs.length > 0) {
            orgId = existingOrgs[0].id;
            console.log("✅ Safety Net: Found existing org", orgId);
          } else {
            // B. If absolutely no org exists, create one
            const { data: newOrg } = await supabase
              .from('organizations')
              .insert({ name: 'My Shop' })
              .select()
              .single();
            
            if (newOrg) {
              orgId = newOrg.id;
              console.log("✅ Safety Net: Created new org", orgId);
            }
          }

          // C. IMPORTANT: Save back to User Metadata
          if (orgId) {
            await supabase.auth.updateUser({
              data: { organization_id: orgId }
            });
            console.log("✅ Safety Net: User metadata updated.");
          }
        }

        // 3. Set the state
        if (orgId) {
          setOrganizationId(orgId);
          setUserRole('admin');
        } else {
          console.error("❌ CRITICAL: Could not resolve Organization ID.");
        }
      } catch (error) {
        console.error("Error in OrganizationContext:", error);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listen for auth changes
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