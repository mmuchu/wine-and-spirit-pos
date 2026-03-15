 // src/components/pos/CartPanel.tsx
"use client";

import { CartItem } from "@/lib/types";
import { formatCurrency } from "./utils";

interface CartPanelProps {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  taxRate?: number;
  isProcessing: boolean;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartPanel({
  cart,
  itemCount,
  subtotal,
  tax,
  total,
  taxRate = 16,
  isProcessing,
  onUpdateQty,
  onRemove,
  onClear,
  onCheckout,
}: CartPanelProps) {
  return (
    // h-full ensures it fills the parent container's fixed height
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      
      {/* Header - Fixed Height (shrink-0) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 bg-blue-600 text-white rounded-full text-sm font-bold">
            {itemCount}
          </span>
          <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Current Sale
          </span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Items List - Scrolls independently (flex-1 overflow-y-auto min-h-0) */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-gray-500">No items in cart</p>
            <p className="text-xs text-gray-400 mt-1">Tap products to add</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {formatCurrency(item.price)} × {item.quantity}
                  </p>
                </div>
                
                <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white hover:text-red-500 rounded transition-colors"
                  >
                    <span className="text-lg font-bold leading-none">−</span>
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-white hover:text-green-500 rounded transition-colors"
                  >
                    <span className="text-lg font-bold leading-none">+</span>
                  </button>
                </div>

                <div className="w-24 text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-[10px] font-semibold text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Sticky Bottom (shrink-0 prevents it from shrinking) */}
      <div className="shrink-0 border-t border-gray-200 bg-white">
        {/* Totals */}
        <div className="px-4 py-3 space-y-1.5 bg-gray-50">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>VAT ({taxRate}%)</span>
            <span className="font-semibold">{formatCurrency(tax)}</span>
          </div>
        </div>
        
        <div className="px-4 py-3 flex justify-between items-center border-t border-gray-200 bg-white">
          <span className="text-base font-extrabold text-gray-900 uppercase">Total</span>
          <span className="text-2xl font-black text-blue-600">{formatCurrency(total)}</span>
        </div>

        {/* Action Button */}
        <div className="p-4 pt-2 bg-white">
          <button
            onClick={onCheckout}
            disabled={isProcessing || cart.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-xl font-bold text-base
                       hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all
                       shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                PROCESSING...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                COMPLETE SALE
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}