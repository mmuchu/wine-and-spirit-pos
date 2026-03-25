 // src/app/reports/stock/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";

export default function StockReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId } = useOrganization();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const action = searchParams.get('action');
    const cash = searchParams.get('cash');
    const notes = searchParams.get('notes');

    if (action === 'close_shift' && cash && organizationId) {
      handleCloseShift(parseFloat(cash), notes || '');
    } else {
      // If no action, just stop loading
      setLoading(false);
    }
  }, [organizationId, searchParams]);

  const handleCloseShift = async (closingCash: number, notes: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      
      // 1. Get the current active shift
      const activeShift = await shiftService.getCurrentShift(organizationId);
      
      if (!activeShift) {
        throw new Error("No active shift found to close.");
      }

      // 2. Get current stock levels for the snapshot
      const { data: products } = await supabase
        .from('products')
        .select('id, stock')
        .eq('organization_id', organizationId);

      const stockSnapshot: Record<string, number> = {};
      products?.forEach(p => {
        if (p.id) stockSnapshot[p.id] = p.stock || 0;
      });

      // 3. Close the shift in the database
      await shiftService.closeShift(
        activeShift.id,
        closingCash,
        stockSnapshot,
        notes
      );

      // 4. Redirect back to Dashboard
      router.push('/');

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to close shift.");
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-xl font-bold text-red-600">Error Closing Shift</h1>
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={() => router.push('/')} 
          className="px-4 py-2 bg-black text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
        <p className="text-gray-600 font-medium">Closing Shift...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">Stock & Shift Management</h1>
      <p className="text-gray-500">No actions pending.</p>
    </div>
  );
}