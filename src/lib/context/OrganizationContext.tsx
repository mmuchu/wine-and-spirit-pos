 // src/lib/context/OrganizationContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Session } from '@supabase/supabase-js';

interface OrgContextType {
  organizationId: string | null;
  userRole: string | null;
  loading: boolean;
  session: Session | null;
}

const OrganizationContext = createContext<OrgContextType>({ 
  organizationId: null, 
  userRole: null, 
  loading: true,
  session: null
});

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Create client once
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 1. Get Initial Session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          processUser(initialSession.user);
        } else {
          setLoading(false);
        }

        // 2. Listen for Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!mounted) return;
          
          setSession(newSession);
          if (newSession) {
            processUser(newSession.user);
          } else {
            setOrganizationId(null);
            setUserRole(null);
            setLoading(false);
          }
        });

        // Cleanup
        return () => {
          mounted = false;
          subscription?.unsubscribe();
        };

      } catch (err) {
        console.error("Auth Init Error:", err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();
  }, [supabase]);

  const processUser = (user: any) => {
    let orgId = user?.user_metadata?.organization_id;
    let role = user?.user_metadata?.role || 'cashier';

    // Safety Hatch for Dev
    if (!orgId || orgId === "undefined") {
      orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      role = 'admin';
      // Update silently in background
      supabase.auth.updateUser({ data: { organization_id: orgId, role: role } });
    }

    setOrganizationId(orgId);
    setUserRole(role);
    setLoading(false);
  };

  return (
    <OrganizationContext.Provider value={{ organizationId, userRole, loading, session }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => useContext(OrganizationContext);