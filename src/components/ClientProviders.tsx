 // src/components/ClientProviders.tsx
"use client";

import { OrganizationProvider } from "@/lib/context/OrganizationContext";
import { Sidebar } from "@/components/layout/Sidebar";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <Sidebar />
      <main className="ml-72 min-h-screen bg-gray-50">
        {children}
      </main>
    </OrganizationProvider>
  );
}