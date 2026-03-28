 // src/components/shifts/ShiftHistoryModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string | null;
}

export function ShiftHistoryModal({ isOpen, onClose, shiftId }: Props) {
  const supabase = createClient();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shiftId) {
      fetchDetails();
    }
  }, [isOpen, shiftId]);

  const fetchDetails = async () => {
    if (!shiftId) return;
    setLoading(true);
    try {
      // FIXED: Replaced missing shiftService.getShiftDetails with direct Supabase query
      const { data } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
      setShift(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <h2 className="font-bold text-lg">Shift Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-400">Loading...</p>
          ) : !shift ? (
            <p className="text-center text-gray-400">Shift not found.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Opened At</p>
                  <p className="font-bold">{new Date(shift.opened_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${shift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {shift.status}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Financials</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Opening Cash</span>
                    <span className="font-medium">{formatCurrency(shift.opening_cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Closing Cash</span>
                    <span className="font-medium">{shift.closing_cash ? formatCurrency(shift.closing_cash) : '-'}</span>
                  </div>
                </div>
              </div>

              {shift.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{shift.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}