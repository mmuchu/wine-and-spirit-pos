 // src/components/pos/PaymentModal.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "./utils";
import { CartItem } from "@/lib/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  items: CartItem[];
  onComplete: (method: string, transactionRef?: string, phone?: string) => void;
  onStkSent?: () => void;
}

export function PaymentModal({ isOpen, onClose, total, items, onComplete, onStkSent }: PaymentModalProps) {
  const [method, setMethod] = useState<"Cash" | "M-Pesa">("Cash");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleMpesaPayment = async () => {
    if (!phone) {
      setError("Please enter a valid phone number");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('mpesa-stk', {
        body: { phone, amount: total },
      });

      if (functionError) throw new Error(functionError.message || "Payment service unavailable");
      if (!data?.success) throw new Error(data?.error || "Payment request failed");

      onStkSent?.();
      onComplete("M-Pesa", data.checkoutRequestId, phone);

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCashPayment = () => {
    onComplete("Cash");
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Complete Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Review items and confirm</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items List - Scrollable Area for Review */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/30 border-b border-gray-100">
          <div className="p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Items Sold ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-gray-400">×{item.quantity}</span>
                  </div>
                  <span className="font-semibold text-gray-900 text-right w-20">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - Sticky Action Bar */}
        <div className="shrink-0 bg-white">
          {/* Total */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-gray-500">Total Amount</span>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {formatCurrency(total)}
              </p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="p-5">
            {/* Method Toggle */}
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setMethod("Cash"); setError(null); }}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all
                  ${method === "Cash" 
                    ? "bg-blue-50 border-blue-500 text-blue-700" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                Cash
              </button>
              <button
                onClick={() => { setMethod("M-Pesa"); setError(null); }}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all
                  ${method === "M-Pesa" 
                    ? "bg-green-50 border-green-500 text-green-700" 
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
              >
                M-Pesa
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-xs border border-red-100">
                {error}
              </div>
            )}

            {/* Cash Payment */}
            {method === "Cash" && (
              <button
                onClick={handleCashPayment}
                className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                Confirm Cash Payment
              </button>
            )}

            {/* M-Pesa Payment */}
            {method === "M-Pesa" && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-400 text-sm">+254</span>
                  </div>
                  <input
                    type="tel"
                    placeholder="712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3 pl-14 border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    disabled={loading}
                  />
                </div>
                <button
                  onClick={handleMpesaPayment}
                  disabled={loading || phone.length < 9}
                  className="w-full bg-green-600 text-white py-3.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors shadow-sm"
                >
                  {loading ? "Processing..." : "Pay with M-Pesa"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}