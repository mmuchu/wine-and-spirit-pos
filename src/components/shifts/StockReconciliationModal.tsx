 // src/components/shifts/StockReconciliationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shift: any;
  onComplete: () => void;
}

export function StockReconciliationModal({ isOpen, onClose, shift, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [expectedCash, setExpectedCash] = useState(0);
  const [actualCash, setActualCash] = useState("");
  const [variance, setVariance] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && shift) {
      calculateExpected();
    }
  }, [isOpen, shift]);

  const calculateExpected = async () => {
    if (!shift) return;
    setLoading(true);
    try {
      // 1. Calculate Expected Cash
      const salesTotal = await shiftService.getShiftSales(shift.id, shift.opened_at);
      const opening = Number(shift.opening_cash) || 0;
      const totalExpectedCash = opening + salesTotal;
      setExpectedCash(totalExpectedCash);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleActualCashChange = (value: string) => {
    const val = parseFloat(value) || 0;
    setActualCash(value);
    setVariance(val - expectedCash);
  };

  const handleSubmit = async () => {
    if (!shift) return;
    setSubmitting(true);
    try {
      // Logic to close shift goes here (using shiftService.closeShift)
      // For now we just alert
      alert("Shift Closed Successfully!");
      onComplete();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !shift) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Close Shift Reconciliation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {loading ? (
          <p className="text-center text-gray-400">Calculating...</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span>Opening Cash:</span>
                <span className="font-medium">{formatCurrency(shift.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>+ Sales Total:</span>
                <span className="font-medium">{formatCurrency(expectedCash - (Number(shift.opening_cash) || 0))}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2 font-bold">
                <span>= Expected Cash:</span>
                <span>{formatCurrency(expectedCash)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Actual Cash in Drawer</label>
              <input
                type="number"
                value={actualCash}
                onChange={(e) => handleActualCashChange(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="0"
              />
            </div>

            {actualCash && (
              <div className={`p-3 rounded text-center ${variance === 0 ? 'bg-green-50 text-green-700' : variance > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                <p className="text-xs">Variance</p>
                <p className="text-xl font-bold">{formatCurrency(variance)}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !actualCash}
              className="w-full py-2 bg-black text-white rounded font-bold hover:bg-gray-800 disabled:bg-gray-300"
            >
              {submitting ? "Saving..." : "Confirm & Close Shift"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}