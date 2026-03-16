// src/components/shifts/ShiftHistoryModal.tsx
"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/components/pos/utils";
import { shiftService } from "@/lib/services/shiftService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string | null;
}

export function ShiftHistoryModal({ isOpen, onClose, shiftId }: Props) {
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && shiftId) {
      fetchDetails();
    }
  }, [isOpen, shiftId]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const data = await shiftService.getShiftDetails(shiftId!);
      setShift(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg">Shift Report Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : shift ? (
          <div className="p-6 overflow-y-auto flex-1">
            {/* Cash Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Opening Cash</p>
                <p className="font-bold">{formatCurrency(shift.opening_cash)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">Closing Cash</p>
                <p className="font-bold">{formatCurrency(shift.closing_cash)}</p>
              </div>
            </div>

            {/* Stock Table */}
            <h4 className="font-semibold text-sm mb-2 text-gray-700">Stock Reconciliation</h4>
            <table className="w-full text-xs border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left border">Product ID</th>
                  <th className="p-2 text-center border">Opening</th>
                  <th className="p-2 text-center border">Closing</th>
                  <th className="p-2 text-center border">Variance</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(shift.closing_stock || {}).map(id => {
                  const opening = shift.opening_stock?.[id] || 0;
                  const closing = shift.closing_stock?.[id] || 0;
                  const variance = closing - opening;
                  
                  return (
                    <tr key={id} className="border-b">
                      <td className="p-2 border font-mono text-[10px]">{id.slice(0,8)}...</td>
                      <td className="p-2 text-center border">{opening}</td>
                      <td className="p-2 text-center border font-bold">{closing}</td>
                      <td className={`p-2 text-center border font-bold ${variance === 0 ? 'text-gray-500' : variance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variance > 0 ? `+${variance}` : variance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}