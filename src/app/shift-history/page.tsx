 // src/app/shift-history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { ShiftHistoryModal } from "@/components/shifts/ShiftHistoryModal";

export default function ShiftHistoryPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await shiftService.getShiftHistory();
      setShifts(data || []);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    setSelectedShiftId(id);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Shift History</h1>
        <p className="text-sm text-gray-500 mt-1">Audit past shifts and stock reconciliation reports.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No closed shifts found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-500">Date</th>
                <th className="text-left p-4 font-semibold text-gray-500">Cashier</th>
                <th className="text-right p-4 font-semibold text-gray-500">Op. Cash</th>
                <th className="text-right p-4 font-semibold text-gray-500">Cl. Cash</th>
                <th className="text-center p-4 font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shifts.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium">{new Date(s.opened_at).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.opened_at).toLocaleTimeString()} - {s.closed_at ? new Date(s.closed_at).toLocaleTimeString() : '...'}
                    </p>
                  </td>
                  <td className="p-4 text-gray-600">{s.user_email || 'Unknown'}</td>
                  <td className="p-4 text-right text-gray-500">{formatCurrency(s.opening_cash)}</td>
                  <td className="p-4 text-right font-bold text-green-600">{formatCurrency(s.closing_cash)}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleViewDetails(s.id)}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold hover:bg-blue-100"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ShiftHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shiftId={selectedShiftId}
      />
    </div>
  );
}