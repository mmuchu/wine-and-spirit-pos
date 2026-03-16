// src/components/customers/RepaymentModal.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/components/pos/utils";

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any; // Customer object
  onConfirm: (amount: number) => void;
}

export function RepaymentModal({ isOpen, onClose, customer, onConfirm }: RepaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(Number(amount));
      onClose();
    } catch (error) {
      console.error("Repayment error:", error);
      alert("Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Record Payment</h2>
        <p className="text-sm text-gray-500 mb-4">
          Recording payment for <span className="font-semibold">{customer.name}</span>
        </p>

        <div className="bg-gray-50 p-3 rounded-lg mb-4 text-center">
          <p className="text-xs text-gray-500 uppercase">Current Debt</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(customer.balance)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paying Now
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
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-green-300"
            >
              {loading ? "Saving..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}