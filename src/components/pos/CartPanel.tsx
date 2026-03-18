 // src/components/pos/CartPanel.tsx
"use client";

import { formatCurrency } from "./utils";

interface CartPanelProps {
  cart: any[];
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

export function CartPanel({ cart, itemCount, subtotal, tax, total, taxRate, isProcessing, onUpdateQty, onRemove, onClear, onCheckout }: CartPanelProps) {
  return (
    <div className="bg-card border rounded-xl flex flex-col h-full shadow-lg overflow-hidden">
      {/* Header - Fixed */}
      <div className="p-4 border-b flex justify-between items-center shrink-0">
        <h3 className="font-bold">Current Sale</h3>
        <span className="text-sm text-muted-foreground">{itemCount} items</span>
      </div>

      {/* Items List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-background group">
              <div className="flex-1">
                <p className="text-sm font-medium leading-tight">{item.name}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onUpdateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded bg-muted hover:bg-muted/50 text-xs font-bold">-</button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded bg-muted hover:bg-muted/50 text-xs font-bold">+</button>
                <button onClick={() => onRemove(item.id)} className="ml-1 text-red-400 hover:text-red-600 text-xs hidden group-hover:block">×</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer - Sticky at Bottom */}
      <div className="border-t p-4 space-y-2 bg-muted/20 shrink-0">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT ({taxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        <button 
          onClick={onCheckout}
          disabled={isProcessing || cart.length === 0}
          className="w-full py-3 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
        >
          {isProcessing ? "Processing..." : "Complete Sale"}
        </button>
      </div>
    </div>
  );
}