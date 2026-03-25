 // src/components/auth/RoleGuard.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/hooks/useRole';

export function RoleGuard({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { userRole, loading } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userRole && !allowedRoles.includes(userRole)) {
      router.push('/');
    }
  }, [userRole, loading, allowedRoles, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Checking permissions...</div>;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return null; 
  }

  return <>{children}</>;
}