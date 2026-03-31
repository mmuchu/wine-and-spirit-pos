 // src/components/pos/CartPanel.tsx
"use client";

import React, { memo } from "react";
import { formatCurrency } from "./utils";

// 1. Strict Typing
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

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
}

// 2. Memoized Item Component for Performance
const CartItemRow = memo(({ 
  item, 
  onUpdateQty, 
  onRemove 
}: { 
  item: CartItem; 
  onUpdateQty: (id: string, delta: number) => void; 
  onRemove: (id: string) => void;
}) => {
  const lineTotal = item.price * item.quantity;
  const isMinQuantity = item.quantity <= 1;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50 transition-colors">
      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatCurrency(item.price)} × {item.quantity}
        </p>
      </div>

      {/* Line Total */}
      <div className="text-sm font-bold text-right w-20 shrink-0">
        {formatCurrency(lineTotal)}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onUpdateQty(item.id, -1)}
          disabled={isMinQuantity}
          aria-label={`Decrease quantity of ${item.name}`}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-muted hover:bg-muted/80 active:scale-95 text-sm font-bold disabled:opacity-30 disabled:active:scale-100 transition-all"
        >
          −
        </button>
        
        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
        
        <button
          onClick={() => onUpdateQty(item.id, 1)}
          aria-label={`Increase quantity of ${item.name}`}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-muted hover:bg-muted/80 active:scale-95 text-sm font-bold transition-all"
        >
          +
        </button>

        <button
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name} from cart`}
          className="ml-1 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 active:scale-95 transition-all"
        >
          ✕
        </button>
      </div>
    </div>
  );
});

CartItemRow.displayName = "CartItemRow";

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
}: CartPanelProps) {
  return (
    <div className="bg-card border rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
      {/* Header - Fixed */}
      <div className="p-4 border-b flex justify-between items-center shrink-0 bg-muted/30">
        <h3 className="font-bold text-base">Current Sale</h3>
        <div className="flex items-center gap-3">
          {cart.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors"
              aria-label="Clear all items from cart"
            >
              Clear All
            </button>
          )}
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Items List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0" role="list" aria-label="Cart items">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center text-2xl">
              🛒
            </div>
            <p className="text-sm font-medium">No items yet</p>
            <p className="text-xs text-center px-4">
              Tap a product on the left to start a new transaction
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItemRow 
              key={item.id} 
              item={item} 
              onUpdateQty={onUpdateQty} 
              onRemove={onRemove} 
            />
          ))
        )}
      </div>

      {/* Footer - Sticky at Bottom */}
      <div className="border-t p-4 space-y-3 bg-card shrink-0">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT ({taxRate}%)</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between text-xl font-bold border-t pt-3">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <button
          onClick={onCheckout}
          disabled={isProcessing || cart.length === 0}
          className="w-full py-4 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-800 active:scale-[0.98] disabled:bg-gray-300 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            "Complete Sale"
          )}
        </button>
      </div>
    </div>
  );
}