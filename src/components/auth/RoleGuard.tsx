// src/components/auth/RoleGuard.tsx
"use client";

import { useRole } from "@/lib/hooks/useRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoleGuard({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { userRole, loading } = useRole();
  const router = useRouter();

  useEffect(() => {
    // If finished loading and role is not in the allowed list -> Kick them out
    if (!loading && userRole && !allowedRoles.includes(userRole)) {
      alert("Access Denied: You do not have permission.");
      router.push("/");
    }
  }, [userRole, loading, router]);

  if (loading) return <div className="p-8 text-center">Checking permissions...</div>;
  
  // If not allowed, show nothing (or a spinner) while redirect happens
  if (!userRole || !allowedRoles.includes(userRole)) {
    return null;
  }

  return <>{children}</>;
}