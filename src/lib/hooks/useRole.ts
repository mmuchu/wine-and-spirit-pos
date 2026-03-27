 // src/lib/hooks/useRole.ts
import { useOrganization } from "@/lib/context/OrganizationContext";

export function useRole() {
  const { userRole, loading } = useOrganization();

  return {
    userRole,
    role: userRole,
    loading,
    isAdmin: userRole === 'admin' || userRole === 'owner',
    isManager: userRole === 'manager' || userRole === 'admin' || userRole === 'owner',
    isOwner: userRole === 'owner',
    isCashier: userRole === 'cashier'
  };
}