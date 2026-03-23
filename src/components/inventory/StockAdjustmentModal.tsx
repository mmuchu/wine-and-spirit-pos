 // src/components/inventory/StockAdjustmentModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { stockService } from "@/lib/services/stockService";
import { formatCurrency } from "@/components/pos/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: any; 
}

export function StockAdjustmentModal({ isOpen, onClose, onSuccess, product }: Props) {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [mode, setMode] = useState<'purchase' | 'adjustment'>('purchase');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  const [quantity, setQuantity] = useState("0");
  const [unitCost, setUnitCost] = useState("0");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [reason, setReason] = useState("stock_take");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity("0");
      setUnitCost(product.cost_price?.toString() || "0");
      setSupplierId("");
      setInvoiceNo("");
      setReason("stock_take");
      setNotes("");
      fetchSuppliers();
    }
  }, [isOpen, product]);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, name');
    if (data) setSuppliers(data);
  };

  const handleSubmit = async () => {
    if (!organizationId || !product) return;
    setLoading(true);

    try {
      const currentShift = await shiftService.getCurrentShift(organizationId);
      const qty = parseInt(quantity);

      if (mode === 'purchase') {
        if (qty <= 0) throw new Error("Quantity must be positive for purchases.");
        await stockService.addStock({
          productId: product.id,
          quantity: qty,
          organizationId,
          shiftId: currentShift?.id,
          supplierId: supplierId || undefined,
          invoiceNo: invoiceNo || undefined,
          unitCost: parseFloat(unitCost) || 0,
          notes
        });
      } else {
        if (qty === 0) throw new Error("Quantity cannot be zero.");
        await stockService.adjustStock({
          productId: product.id,
          quantity: qty, 
          organizationId,
          shiftId: currentShift?.id,
          reason: reason,
          notes
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      {/* FIX: Added max-h-[90vh] and flex flex-col */}
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header - Sticky */}
        <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-sm text-gray-400">Current Stock: <span className="font-bold text-white">{product.stock}</span></p>
          </div>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
          
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setMode('purchase')}
              className={`flex-1 py-2 rounded text-sm font-bold transition ${mode === 'purchase' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
            >
              Stock Purchase (In)
            </button>
            <button 
              onClick={() => setMode('adjustment')}
              className={`flex-1 py-2 rounded text-sm font-bold transition ${mode === 'adjustment' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}
            >
              Adjustment (In/Out)
            </button>
          </div>

          {mode === 'purchase' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Quantity *</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full p-3 border rounded-lg text-lg font-bold"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Unit Cost (Buy Price)</label>
                  <input 
                    type="number" 
                    value={unitCost} 
                    onChange={e => setUnitCost(e.target.value)}
                    className="w-full p-3 border rounded-lg text-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Supplier</label>
                  <select 
                    value={supplierId} 
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Invoice #</label>
                  <input 
                    type="text" 
                    value={invoiceNo} 
                    onChange={e => setInvoiceNo(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="INV-001"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                <p className="text-xs text-blue-600 font-medium">Total Purchase Value</p>
                <p className="text-3xl font-extrabold text-blue-800">
                  {formatCurrency((parseFloat(unitCost) || 0) * (parseInt(quantity) || 0))}
                </p>
              </div>
            </div>
          )}

          {mode === 'adjustment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Quantity Change *</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full p-3 border rounded-lg text-lg font-bold"
                    placeholder="e.g. -2 for loss"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Use negative (-) for damages/loss.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Reason *</label>
                  <select 
                    value={reason} 
                    onChange={e => setReason(e.target.value)}
                    className="w-full p-3 border rounded-lg bg-white"
                  >
                    <option value="stock_take">Stock Take</option>
                    <option value="damage">Damage / Breakage</option>
                    <option value="theft">Theft / Loss</option>
                    <option value="return">Return to Supplier</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-center">
                <p className="text-sm text-yellow-700 font-medium">New Stock Level Will Be:</p>
                <p className="text-3xl font-extrabold text-yellow-800">
                  {product.stock + (parseInt(quantity) || 0)}
                </p>
                { (product.stock + (parseInt(quantity) || 0)) < 0 && (
                  <p className="text-red-600 text-xs font-bold mt-1">Warning: Stock cannot be negative!</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              rows={2}
              placeholder="Optional details..."
            />
          </div>
        </div>

        {/* Footer - Sticky at bottom */}
        <div className="flex gap-3 p-6 border-t bg-white shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 py-3 border rounded-lg font-bold hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 py-3 rounded-lg font-bold text-white disabled:bg-gray-300 ${
              mode === 'purchase' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {loading ? "Saving..." : "Confirm Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}