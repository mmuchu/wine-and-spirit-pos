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
        let orgId = user.user_metadata?.organization_id;
        
        // FIX: Check if orgId is missing OR if it is the invalid string "undefined"
        if (!orgId || orgId === "undefined") {
           console.warn("Invalid Org ID found, resetting to default...");
           orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; 
           
           // Fix the user metadata permanently
           await supabase.auth.updateUser({ data: { organization_id: orgId } });
        }
        
        setOrganizationId(orgId);
      }
      setLoading(false);
    };
    
    initOrg();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       if (!session?.user) {
         setOrganizationId(null);
       } else {
         let orgId = session.user.user_metadata?.organization_id;
         if (!orgId || orgId === "undefined") {
            orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
         }
         setOrganizationId(orgId);
       }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, loading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);