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

        // 1. Check Metadata (Fastest)
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role;

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role || 'admin');
          setLoading(false);
          return;
        }

        // 2. Check organization_members table
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.organization_id) {
          setOrganizationId(member.organization_id);
          setUserRole(member.role || 'admin');
          
          // Save to metadata for speed
          await supabase.auth.updateUser({
            data: { organization_id: member.organization_id, role: member.role }
          });
          
          setLoading(false);
          return;
        }

        // 3. SELF-HEALING (Robust Version)
        console.log("No organization found. Attempting auto-setup...");
        
        // A. Find or Create 'Kenyan Spirit'
        let targetOrgId: string | undefined;
        
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', 'Kenyan Spirit')
          .maybeSingle();

        if (existingOrg) {
          targetOrgId = existingOrg.id;
        } else {
          const { data: newOrg, error: createError } = await supabase
            .from('organizations')
            .insert({ name: 'Kenyan Spirit' })
            .select('id')
            .single();
          
          if (createError) throw createError;
          targetOrgId = newOrg.id;
        }

        // B. Add user as Admin (UPSERT to avoid duplicate errors)
        if (targetOrgId) {
          await supabase.from('organization_members').upsert({
            organization_id: targetOrgId,
            user_id: user.id,
            role: 'admin'
          }, { onConflict: 'organization_id, user_id' });

          // C. Update Metadata
          await supabase.auth.updateUser({
            data: { organization_id: targetOrgId, role: 'admin' }
          });

          setOrganizationId(targetOrgId);
          setUserRole('admin');
        }

      } catch (err) {
        console.error("Org Context Error:", err);
        // Do not leave it hanging, set null
        setOrganizationId(null);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    // Safety Timeout
    const timeout = setTimeout(() => {
      console.warn("Context timeout");
      setLoading(false);
    }, 5000);

    loadOrg().then(() => clearTimeout(timeout));
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);