 // src/lib/hooks/useRole.ts
import { useOrganization } from "@/lib/context/OrganizationContext";

export const useRole = () => {
  const { userRole } = useOrganization();

  const isManager = userRole === 'admin' || userRole === 'manager';
  const isAdmin = userRole === 'admin';

  return { userRole, isManager, isAdmin };
};