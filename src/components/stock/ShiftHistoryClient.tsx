 // src/components/stock/ShiftHistoryClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

export function ShiftHistoryClient() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  useEffect(() => {
    if (organizationId) loadHistory();
  }, [organizationId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*') 
        .eq('organization_id', organizationId)
        .order('opened_at', { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading history...</div>;

  // Detail View
  if (selectedShift) {
    return (
      <div className="p-6 space-y-6">
        <button onClick={() => setSelectedShift(null)} className="text-sm text-gray-500 hover:text-black mb-4">&larr; Back to History</button>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Shift Audit</h2>
              <p className="text-gray-500 text-sm">Opened: {new Date(selectedShift.opened_at).toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedShift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {selectedShift.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 font-bold uppercase">Opening Cash</p>
              <p className="text-xl font-bold">{formatCurrency(selectedShift.opening_cash || 0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 font-bold uppercase">Closing Cash</p>
              <p className="text-xl font-bold">{formatCurrency(selectedShift.closing_cash || 0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 font-bold uppercase">User</p>
              <p className="text-lg font-bold font-mono">{selectedShift.user_id?.substring(0,8)}...</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-bold">Stock Variance</h3></div>
          {selectedShift.closing_stock ? (
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead className="bg-gray-50"><tr><th className="p-3 text-left">Product ID</th><th className="p-3 text-center">Op</th><th className="p-3 text-center">Cl</th><th className="p-3 text-center">Var</th></tr></thead>
                 <tbody className="divide-y">
                   {Object.entries(selectedShift.closing_stock).map(([id, closing]: [string, any]) => {
                      const opening = selectedShift.opening_stock?.[id] || 0;
                      const variance = opening - closing;
                      return (
                        <tr key={id} className={variance !== 0 ? 'bg-red-50' : ''}>
                          <td className="p-3 font-mono text-gray-500 text-xs">{id.substring(0, 8)}...</td>
                          <td className="p-3 text-center">{opening}</td>
                          <td className="p-3 text-center font-bold">{closing}</td>
                          <td className={`p-3 text-center font-bold ${variance !== 0 ? 'text-red-600' : 'text-gray-400'}`}>{variance > 0 ? `+${variance}` : variance}</td>
                        </tr>
                      );
                   })}
                 </tbody>
               </table>
             </div>
          ) : <div className="p-8 text-center text-gray-400">No stock data.</div>}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Shift History</h1>
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-bold">Date</th>
              <th className="text-left p-4 font-bold">User</th>
              <th className="text-right p-4 font-bold">Op. Cash</th>
              <th className="text-right p-4 font-bold">Cl. Cash</th>
              <th className="text-center p-4 font-bold">Status</th>
              <th className="text-right p-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shifts.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No shifts found.</td></tr>}
            {shifts.map(shift => (
              <tr key={shift.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <p className="font-medium">{new Date(shift.opened_at).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400">{new Date(shift.opened_at).toLocaleTimeString()}</p>
                </td>
                <td className="p-4 text-gray-600 font-mono text-xs">{shift.user_id?.substring(0,8)}...</td>
                <td className="p-4 text-right font-mono">{formatCurrency(shift.opening_cash || 0)}</td>
                <td className="p-4 text-right font-mono">{shift.closed_at ? formatCurrency(shift.closing_cash || 0) : '-'}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{shift.status.toUpperCase()}</span>
                </td>
                <td className="p-4 text-right">
                  {shift.status === 'closed' && <button onClick={() => setSelectedShift(shift)} className="text-blue-600 hover:underline font-bold text-xs">View Audit</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}