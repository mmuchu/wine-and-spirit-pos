 // src/components/pos/CartPanel.tsx
"use client";

import { CartItem } from "@/lib/types";
import { formatCurrency } from "./utils";

// Define the properties the component accepts
interface CartPanelProps {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  isProcessing: boolean;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  isCreditMode?: boolean; // Optional prop for credit mode styling
}

export function CartPanel({
  cart,
  itemCount,
  subtotal,
  tax,
  total,
  taxRate,
  isProcessing,
  onUpdateQty,
  onRemove,
  onClear,
  onCheckout,
  isCreditMode
}: CartPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-lg font-bold text-lg shadow-inner">
            {itemCount}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase">Current Sale</h2>
            <p className="text-xs text-gray-400">{itemCount} items in cart</p>
          </div>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded hover:bg-red-50"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Items List - Scrollable Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-400">Cart is Empty</p>
            <p className="text-sm text-gray-300 mt-1">Tap products to add them</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)} each</p>
                </div>
                
                <div className="flex items-center gap-1 shrink-0 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="w-9 h-9 rounded flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-white hover:text-red-500 transition-colors shadow-sm"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="w-9 h-9 rounded flex items-center justify-center text-xl font-bold text-gray-600 hover:bg-white hover:text-green-600 transition-colors shadow-sm"
                  >
                    +
                  </button>
                </div>

                <div className="w-24 text-right shrink-0">
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>

                <button
                  onClick={() => onRemove(item.id)}
                  className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-gray-50">
        <div className="px-5 py-3 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>VAT ({taxRate}%)</span>
            <span className="font-medium text-gray-700">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between pt-3 mt-1 border-t border-dashed border-gray-200">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="p-4 pt-2 bg-gradient-to-b from-gray-50 to-gray-100">
          <button
            onClick={onCheckout}
            disabled={isProcessing || cart.length === 0}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-bold text-base transition-all shadow-lg hover:shadow-xl active:shadow-inner
               ${isCreditMode 
                 ? "bg-blue-600 text-white hover:bg-blue-700" 
                 : "bg-black text-white hover:bg-gray-800"}
               disabled:bg-gray-200 disabled:text-gray-500`}
          >
            {isProcessing ? "Processing..." : isCreditMode ? "SELL ON CREDIT" : "COMPLETE SALE"}
          </button>
        </div>
      </div>
    </div>
  );
}