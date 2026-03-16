 // src/components/pos/PaymentModal.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "./utils";
import { CartItem } from "@/lib/types";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  items: CartItem[];
  onComplete: (method: string, ref?: string, phone?: string) => void;
  onStkSent?: () => void;
}

export function PaymentModal({ isOpen, onClose, total, items, onComplete, onStkSent }: PaymentModalProps) {
  const [method, setMethod] = useState<"Cash" | "M-Pesa">("Cash");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePay = async () => {
    setLoading(true);
    try {
      if (method === "M-Pesa") {
        if (!phone || phone.length < 9) {
          alert("Please enter a valid phone number");
          setLoading(false);
          return;
        }
        // In a real app, you'd trigger STK push here via an Edge Function
        if (onStkSent) onStkSent();
        
        // Simulating STK push delay
        await new Promise(r => setTimeout(r, 1000));
        
        onComplete("M-Pesa", `MPESA-${Date.now()}`, phone);
      } else {
        onComplete("Cash");
      }
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold">Confirm Sale</h2>
            <p className="text-xs text-gray-500">Review items before completing</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Item List Section - Scrollable */}
        <div className="flex-1 overflow-y-auto border-b bg-gray-50">
          <div className="p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Items ({items.length})</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.price)} &times; {item.quantity}</p>
                  </div>
                  <p className="font-bold text-gray-900 shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Method & Actions */}
        <div className="p-4 space-y-4 shrink-0">
          
          {/* Total */}
          <div className="text-center border-b pb-4">
            <p className="text-xs text-gray-500 uppercase">Total Amount</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
          </div>

          {/* Method Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("Cash")}
              className={`p-3 rounded-lg border-2 font-bold text-sm transition ${
                method === "Cash" 
                  ? "bg-green-50 border-green-500 text-green-700" 
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              Cash
            </button>
            <button
              onClick={() => setMethod("M-Pesa")}
              className={`p-3 rounded-lg border-2 font-bold text-sm transition ${
                method === "M-Pesa" 
                  ? "bg-blue-50 border-blue-500 text-blue-700" 
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              M-Pesa
            </button>
          </div>

          {/* Phone Input for M-Pesa */}
          {method === "M-Pesa" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Customer Phone</label>
              <input
                type="tel"
                placeholder="0712 345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose} 
              className="flex-1 py-3 px-4 border rounded-lg font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing
                </>
              ) : (
                `Complete ${method}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}