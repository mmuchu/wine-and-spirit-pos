 // src/components/pos/CartPanel.tsx
"use client";
import { CartItem } from "@/lib/types";

interface Props {
  cart: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isProcessing: boolean;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCheckout: () => void;
}

export function CartPanel({ cart, itemCount, subtotal, tax, total, isProcessing, onUpdateQty, onRemove, onClear, onCheckout }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Current Sale</h2>
            <p className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        {cart.length > 0 && (
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium">
            Clear All
          </button>
        )}
      </div>

      {/* Items List (Scrollable) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <svg className="w-12 h-12 mb-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs text-muted-foreground mt-1">Click products to add</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {cart.map((item) => (
              <li key={item.id} className="p-4 flex gap-4 hover:bg-muted/20 transition-colors">
                {/* Product Image/Icon */}
                <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{item.name.charAt(0)}</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="font-medium text-foreground truncate text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{item.sku}</p>
                  <p className="text-sm text-primary font-semibold">${item.price.toFixed(2)}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 -m-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onUpdateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-muted/80 flex items-center justify-center transition-colors text-xs font-bold">-</button>
                    <span className="w-8 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-muted/80 flex items-center justify-center transition-colors text-xs font-bold">+</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Totals */}
      {cart.length > 0 && (
        <div className="border-t border-border p-5 space-y-4 bg-card flex-shrink-0">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
              <span>Total</span><span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button 
            onClick={onCheckout} 
            disabled={isProcessing} 
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 font-bold text-lg hover:opacity-90 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
          >
            {isProcessing ? "Processing..." : "Complete Sale"}
          </button>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="py-2.5 rounded-xl bg-muted border border-border text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-all">Hold</button>
            <button className="py-2.5 rounded-xl bg-muted border border-border text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-all">Discount</button>
          </div>
        </div>
      )}
    </div>
  );
}