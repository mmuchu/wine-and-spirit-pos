 // src/components/layout/LicenseGuard.tsx
"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { licenseService } from "@/lib/services/licenseService";

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const { organizationId } = useOrganization();
  const [status, setStatus] = useState<'loading' | 'active' | 'expired'>('loading');
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait for organizationId to be available
    if (organizationId) {
        setReady(true);
    }
  }, [organizationId]);

  useEffect(() => {
    if (ready) checkLicense();
  }, [ready]);

  const checkLicense = async () => {
    // Pass organizationId to the service
    const result = await licenseService.checkLicense(organizationId);
    
    if (!result.isValid) {
      setStatus('expired');
      setExpiryDate(result.expiresAt || "");
    } else {
      setStatus('active');
    }
  };

  if (!ready || status === 'loading') {
    return <div className="h-screen flex items-center justify-center bg-black text-white">Verifying License...</div>;
  }

  if (status === 'expired') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-red-50 text-center p-8">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Expired</h1>
          <p className="text-gray-600 mb-4">
            Your access expired on <span className="font-bold">{expiryDate ? new Date(expiryDate).toLocaleDateString() : 'N/A'}</span>.
          </p>
          <button onClick={checkLicense} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Check Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}