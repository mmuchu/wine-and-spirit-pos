 // src/app/shift-history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function ShiftHistoryPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) fetchHistory();
  }, [organizationId]);

  const fetchHistory = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const data = await shiftService.getShiftHistory(organizationId);
      setShifts(data || []);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading history...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shift History</h1>
        <p className="text-gray-500 text-sm mt-1">Record of all opened and closed shifts.</p>
      </div>

      <div className="bg-white rounded-xl border shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold">Opened At</th>
              <th className="text-left p-3 font-semibold">Closed At</th>
              <th className="text-right p-3 font-semibold">Opening Cash</th>
              <th className="text-right p-3 font-semibold">Closing Cash</th>
              <th className="text-center p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shifts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No shifts found.</td></tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-3">{new Date(s.opened_at).toLocaleString()}</td>
                  <td className="p-3">{s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}</td>
                  <td className="p-3 text-right">{formatCurrency(s.opening_cash)}</td>
                  <td className="p-3 text-right">{s.closing_cash ? formatCurrency(s.closing_cash) : '-'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}