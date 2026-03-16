 // src/components/shifts/StockReconciliationModal.tsx
"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/components/pos/utils";
import { stockService } from "@/lib/services/stockService";
import { shiftService } from "@/lib/services/shiftService"; // ADDED THIS LINE
import { Product } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (closingStock: Record<string, number>, notes: string, closingCash: number) => void;
  shift: any;
  products: Product[];
}

export function StockReconciliationModal({ isOpen, onClose, onConfirm, shift, products }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Cash State
  const [expectedCash, setExpectedCash] = useState(0);
  const [actualCash, setActualCash] = useState("");
  const [cashVariance, setCashVariance] = useState(0);
  
  // Notes State
  const [varianceNotes, setVarianceNotes] = useState("");

  useEffect(() => {
    if (!isOpen || !shift) return;
    prepareData();
  }, [isOpen, shift]);

  const prepareData = async () => {
    setLoading(true);
    try {
      // 1. Calculate Expected Cash
      const salesTotal = await shiftService.getShiftSales(shift.id, shift.opened_at);
      const opening = Number(shift.opening_cash) || 0;
      const totalExpectedCash = opening + salesTotal;
      setExpectedCash(totalExpectedCash);
      
      setActualCash(totalExpectedCash.toString());
      setCashVariance(0);

      // 2. Prepare Stock Rows
      const openingData = shift.opening_stock || {};
      const salesCounts = await stockService.getShiftSalesCount(shift.opened_at);
      const purchaseCounts = await stockService.getShiftPurchasesCount(shift.opened_at);

      const data = products.map(p => {
        const openingStock = openingData[p.id] || 0;
        const purchases = purchaseCounts[p.id] || 0;
        const sales = salesCounts[p.id] || 0;
        const expected = Math.max(0, openingStock) + purchases - sales;
        
        return {
          id: p.id,
          name: p.name,
          opening: Math.max(0, openingStock),
          purchases,
          sales,
          expected: Math.max(0, expected),
          actual: Math.max(0, expected),
          variance: 0
        };
      });
      
      setRows(data);
    } catch (e) {
      console.error(e);
      alert("Failed to load shift data");
    } finally {
      setLoading(false);
    }
  };

  const handleCashChange = (value: string) => {
    const val = parseFloat(value) || 0;
    setActualCash(value);
    setCashVariance(val - expectedCash);
  };

  const handleStockChange = (id: string, value: string) => {
    const val = parseInt(value) || 0;
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, actual: val, variance: val - r.expected };
      }
      return r;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const closingData: Record<string, number> = {};
    rows.forEach(r => {
      closingData[r.id] = r.actual;
    });

    const cash = parseFloat(actualCash) || 0;
    
    const finalNotes = [];
    if (cashVariance !== 0) finalNotes.push(`CASH VARIANCE: ${cashVariance > 0 ? 'Over' : 'Short'} ${formatCurrency(Math.abs(cashVariance))}`);
    if (varianceNotes) finalNotes.push(`NOTES: ${varianceNotes}`);
    
    onConfirm(closingData, finalNotes.join(". "), cash);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl p-6 my-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">DAILY RETURN REPORT</h2>
            <p className="text-xs text-gray-500">
              Shift: {new Date(shift.opened_at).toLocaleDateString()} | ID: {shift.id.slice(0,8)}
            </p>
          </div>
          <button onClick={() => window.print()} className="px-3 py-1 bg-gray-100 text-xs font-bold rounded border hover:bg-gray-200 no-print">
            Print
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            
            {/* SECTION 1: CASH */}
            <div className="border rounded-lg p-4 mb-6 bg-gray-50">
              <h3 className="font-bold text-sm mb-3 text-gray-700 uppercase">1. Cash Reconciliation</h3>
              <div className="grid grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-xs text-gray-500">Expected</label>
                  <p className="font-bold text-lg">{formatCurrency(expectedCash)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Actual Count</label>
                  <input 
                    type="number"
                    value={actualCash}
                    onChange={(e) => handleCashChange(e.target.value)}
                    className="w-full p-2 border rounded text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Variance</label>
                  <p className={`font-bold text-lg ${cashVariance === 0 ? 'text-gray-600' : cashVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cashVariance > 0 ? '+' : ''}{formatCurrency(cashVariance)}
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: STOCK */}
            <div className="border rounded-lg mb-6 overflow-hidden">
              <div className="bg-gray-100 p-2 border-b">
                <h3 className="font-bold text-sm text-gray-700 uppercase">2. Stock Reconciliation</h3>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-200 sticky top-0">
                    <tr>
                      <th className="p-2 text-left border font-bold">Product</th>
                      <th className="p-2 text-center border font-bold">Op</th>
                      <th className="p-2 text-center border font-bold">In</th>
                      <th className="p-2 text-center border font-bold">Out</th>
                      <th className="p-2 text-center border font-bold bg-blue-100">Exp</th>
                      <th className="p-2 text-center border font-bold bg-yellow-100">Actual</th>
                      <th className="p-2 text-center border font-bold">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 border">{r.name}</td>
                        <td className="p-2 text-center border text-gray-500">{r.opening}</td>
                        <td className="p-2 text-center border text-green-600">+{r.purchases}</td>
                        <td className="p-2 text-center border text-red-600">-{r.sales}</td>
                        <td className="p-2 text-center border font-bold bg-blue-50">{r.expected}</td>
                        <td className="p-2 border bg-yellow-50">
                          <input 
                            type="number"
                            value={r.actual}
                            onChange={(e) => handleStockChange(r.id, e.target.value)}
                            className="w-full p-1 border rounded text-center font-bold"
                          />
                        </td>
                        <td className={`p-2 text-center border font-bold ${
                            r.variance === 0 ? 'text-gray-400' : 
                            r.variance > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {r.variance > 0 ? `+${r.variance}` : r.variance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: NOTES */}
            <div className="mb-6 no-print">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                3. Notes / Explanation
              </label>
              <textarea
                value={varianceNotes}
                onChange={(e) => setVarianceNotes(e.target.value)}
                rows={2}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="Explain any variances above..."
              />
            </div>

            <div className="flex gap-3 no-print">
              <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-lg font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800">
                Submit & Close Shift
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}