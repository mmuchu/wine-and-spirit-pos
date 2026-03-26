 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface OrgContextType {
  organizationId: string | null;
  userRole: string | null;
  loading: boolean;
  isLicenseValid: boolean;
}

const OrganizationContext = createContext<OrgContextType>({
  organizationId: null,
  userRole: null,
  loading: true,
  isLicenseValid: true,
});

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLicenseValid, setIsLicenseValid] = useState(true);

  useEffect(() => {
    const loadOrg = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // DEBUG: Show us exactly what ID is coming from Supabase
        const myId = 'ea6cf402-8116-4440-9d40-446454366071';
        
        console.log("DEBUG - User ID:", user.id);
        console.log("DEBUG - Master ID:", myId);
        console.log("DEBUG - Match:", user.id === myId);
        
        // MASTER ADMIN BYPASS
        if (user.id === myId) {
          console.log("MASTER ADMIN ACCESS GRANTED");
          setOrganizationId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
          setUserRole('admin');
          setIsLicenseValid(true);
          setLoading(false);
          return;
        }

        // NORMAL FLOW
        const orgId = user.user_metadata?.organization_id;
        const role = user.user_metadata?.role;

        if (orgId) {
          setOrganizationId(orgId);
          setUserRole(role || 'admin');
          setIsLicenseValid(true);
          setLoading(false);
          return;
        }

        // DB CHECK
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (member?.organization_id) {
          setOrganizationId(member.organization_id);
          setUserRole(member.role || 'admin');
          setIsLicenseValid(true);
        } else {
          console.error("NO ORG FOUND FOR USER");
        }
      } catch (err) {
        console.error("CTX ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => setLoading(false), 5000);
    loadOrg().then(() => clearTimeout(timeout));
  }, []);

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading, isLicenseValid }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);