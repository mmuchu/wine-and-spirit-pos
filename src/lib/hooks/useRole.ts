 // src/lib/hooks/useRole.ts
import { useOrganization } from "@/lib/context/OrganizationContext";

export function useRole() {
  const { userRole } = useOrganization();

  return {
    userRole: userRole, // Keep this name for Sidebar compatibility
    role: userRole,
    isAdmin: userRole === 'admin' || userRole === 'owner',
    isManager: userRole === 'manager' || userRole === 'admin' || userRole === 'owner',
    isOwner: userRole === 'owner',
    isCashier: userRole === 'cashier'
  };
}