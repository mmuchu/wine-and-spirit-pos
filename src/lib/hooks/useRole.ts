 // src/lib/hooks/useRole.ts
import { useOrganization } from "@/lib/context/OrganizationContext";

export const useRole = () => {
  // Get loading state from context
  const { userRole, organizationId, loading } = useOrganization();

  const isManager = userRole === 'admin' || userRole === 'manager';
  const isAdmin = userRole === 'admin';

  // SAFETY HATCH: Owner of the main organization has full power
  const MASTER_ORG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const isOwner = organizationId === MASTER_ORG_ID;

  return { userRole, isManager, isAdmin, isOwner, loading };
}