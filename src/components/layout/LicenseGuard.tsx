 // src/components/layout/LicenseGuard.tsx
"use client";

import { useState, useEffect } from "react";

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  // We skip the loading state to prevent hydration mismatch flash
  // Since there are no duplicate HTML tags, this should resolve the 418 error.
  
  // For MVP, we simply return children. 
  // You can add actual license logic here later if needed.
  return <>{children}</>;
}