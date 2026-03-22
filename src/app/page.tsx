 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function DashboardPage() {
  const { organizationId } = useOrganization();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch / build crash
  if (!mounted) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-500">Org ID: {organizationId || 'Checking...'}</p>
      
      {!organizationId && (
        <div className="bg-yellow-50 border p-4 rounded">
          <p className="font-bold">Waiting for connection...</p>
          <p className="text-sm">If this persists, check your .env variables.</p>
        </div>
      )}
      
      {organizationId && (
        <div className="bg-green-50 border p-4 rounded">
          <p className="font-bold text-green-700">System Online</p>
          <p className="text-sm">Your dashboard is working.</p>
        </div>
      )}
    </div>
  );
}