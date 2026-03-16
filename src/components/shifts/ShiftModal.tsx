 // src/components/shifts/ShiftModal.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/components/pos/utils";

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, notes?: string) => void; // Added notes param
  mode: 'open' | 'close';
  expectedCash?: number;
}

export function ShiftModal({ isOpen, onClose, onConfirm, mode, expectedCash = 0 }: ShiftModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [varianceReason, setVarianceReason] = useState("");

  if (!isOpen) return null;

  const actualValue = parseFloat(amount) || 0;
  const difference = actualValue - expectedCash;
  const isVariance = difference !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If closing and there is a variance, require a reason
    if (mode === 'close' && isVariance && !varianceReason.trim()) {
      alert("Please explain the cash variance before confirming.");
      return;
    }

    setLoading(true);
    try {
      // Pass amount AND the variance reason
      onConfirm(actualValue, varianceReason);
      // Reset state
      setAmount("");
      setVarianceReason("");
      onClose();
    } catch (error) {
      console.error("Shift error:", error);
      alert("Failed to update shift.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {mode === 'open' ? 'Start Shift' : 'Close Shift'}
        </h2>

        {mode === 'close' && (
          <div className="bg-gray-50 p-3 rounded-lg mb-4 text-center">
            <p className="text-xs text-gray-500 uppercase">Expected Cash in Drawer</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(expectedCash)}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'open' ? 'Starting Cash Amount' : 'Actual Cash Counted'}
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">Ksh</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 pl-12 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* VARIANCE SECTION - Only for closing */}
          {mode === 'close' && amount && (
            <div className="border-t pt-3 mt-3 space-y-2">
              <div className={`flex justify-between items-center p-2 rounded ${difference === 0 ? 'bg-green-50' : difference > 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <span className="font-semibold text-sm">
                  {difference === 0 ? 'Balanced' : difference > 0 ? 'Overage' : 'Shortage'}
                </span>
                <span className={`font-bold ${difference === 0 ? 'text-green-700' : difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(difference))}
                </span>
              </div>

              {/* FORCE EXPLANATION IF VARIANCE */}
              {isVariance && (
                <div>
                  <label className="block text-xs font-bold text-red-600 mb-1 uppercase">
                    Reason for Variance (Required)
                  </label>
                  <input
                    type="text"
                    required
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                    className="w-full p-2 border border-red-200 rounded-lg text-sm focus:ring-red-500"
                    placeholder="e.g., Cash shortage, Float error, Gave change twice"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Processing..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}