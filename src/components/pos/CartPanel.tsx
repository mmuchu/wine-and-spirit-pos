 // Update interface
interface CartPanelProps {
  // ... existing props
  isCreditMode?: boolean; // Add this
}

export function CartPanel({
  cart, itemCount, subtotal, tax, total, taxRate, isProcessing, onUpdateQty, onRemove, onClear, onCheckout, isCreditMode
}: CartPanelProps) {
  // ... existing code ...

  return (
    <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
       {/* ... Header and List ... */}

       {/* Footer */}
       <div className="shrink-0 border-t border-gray-200 bg-gray-50">
         {/* ... Totals ... */}

         <div className="p-4 pt-2 bg-gradient-to-b from-gray-50 to-gray-100">
           <button
             onClick={onCheckout}
             disabled={isProcessing || cart.length === 0}
             className={`w-full flex items-center justify-center gap-3 py-4 rounded-lg font-bold text-base transition-all shadow-sm
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