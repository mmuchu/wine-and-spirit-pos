 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OrgContextType {
  organizationId: string | null;
  loading: boolean;
}

const OrganizationContext = createContext<OrgContextType>({ organizationId: null, loading: true });

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const initOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check user metadata for organization_id
        let orgId = user.user_metadata?.organization_id;
        
        // If missing (legacy users), assign the default existing ID
        if (!orgId) {
          orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
          // Update user metadata for future use
          await supabase.auth.updateUser({ data: { organization_id: orgId } });
        }
        
        setOrganizationId(orgId);
      }
      setLoading(false);
    };
    
    initOrg();
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);