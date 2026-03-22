 // src/components/layout/LicenseGuard.tsx
"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { licenseService } from "@/lib/services/licenseService";

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const { organizationId } = useOrganization();
  const [status, setStatus] = useState<'loading' | 'active' | 'invalid'>('loading');
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (organizationId) {
      verify();
    }
  }, [organizationId]);

  const verify = async () => {
    const result = await licenseService.validateLicense(organizationId);
    
    if (result.isValid) {
      setStatus('active');
    } else {
      setStatus('invalid');
      setMessage(result.message);
    }
  };

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 flex-col gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        <p className="text-sm text-gray-500">Verifying License...</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-center p-8">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md border border-red-200">
          <h1 className="text-2xl font-bold text-red-600 mb-2">License Invalid</h1>
          <p className="text-gray-600 mb-1">
            This copy of Kenyan Spirit POS is not licensed for this shop.
          </p>
          <p className="text-xs text-gray-400 mt-4 mb-4 bg-gray-50 p-2 rounded border">
            Error: {message}
          </p>
          <button onClick={verify} className="text-xs text-blue-600 underline">
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}