 // src/app/reports/stock/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { exportToCSV } from "@/lib/utils/export";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = 'force-dynamic';

function StockReportContent() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [actualInputs, setActualInputs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // NEW: Track which row is currently being edited
  const [focusedRow, setFocusedRow] = useState<string | null>(null);

  const [isClosingShift, setIsClosingShift] = useState(false);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    const cash = searchParams.get('cash');
    if (action === 'close_shift' && cash) {
      setIsClosingShift(true);
      setClosingCash(parseFloat(cash));
    }
  }, [searchParams]);

  useEffect(() => {
    if (organizationId) {
        checkActiveShift();
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId && currentShift) {
        generateReport();
    }
  }, [organizationId, currentShift]);

  const checkActiveShift = async () => {
    if (!organizationId) return;

    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
      if(!shift) setLoading(false);
    } catch (err) { 
        console.error("Shift error", err); 
        setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!organizationId || !currentShift) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data: products, error: pError } = await supabase
        .from("products")
        .select("id, name, stock");
      
      if (pError) throw new Error(`Products Error: ${pError.message}`);

      const openingStockMap = currentShift.opening_stock || {};

      const { data: sales } = await supabase
        .from("sales")
        .select("items")
        .eq("organization_id", organizationId)
        .eq("shift_id", currentShift.id); 

      const { data: purchases } = await supabase
        .from("stock_movements")
        .select("product_id, quantity")
        .eq("organization_id", organizationId)
        .eq("shift_id", currentShift.id)
        .eq("type", "purchase");

      const report = products.map((p: any) => {
        const opening = openingStockMap[p.id] || 0;

        let soldQty = 0;
        sales?.forEach((sale: any) => {
          sale.items?.forEach((item: any) => {
            if (item.id === p.id) soldQty += item.quantity;
          });
        });

        let recordedPurchases = purchases
          ?.filter((pur: any) => pur.product_id === p.id)
          .reduce((sum: number, pur: any) => sum + pur.quantity, 0) || 0;

        const closingStock = Math.max(0, p.stock || 0); 

        const impliedPurchases = closingStock - opening + soldQty;
        let purchasedQty = Math.max(recordedPurchases, impliedPurchases);
        purchasedQty = Math.max(0, purchasedQty);

        const expectedStock = opening + purchasedQty - soldQty;

        return {
          id: p.id, name: p.name,
          opening: opening,
          purchased: purchasedQty,
          sold: soldQty,
          expected: expectedStock,
          systemStock: closingStock,
          variance: closingStock - expectedStock
        };
      });

      setReportData(report);
      const initialInputs: Record<string, number> = {};
      report.forEach((r: any) => { initialInputs[r.id] = r.expected; });
      setActualInputs(initialInputs);

    } catch (err: any) {
      console.error("Report Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (productId: string, value: string) => {
    const num = parseInt(value) || 0;
    setActualInputs(prev => ({ ...prev, [productId]: num }));
  };

  const getVariance = (productId: string) => {
    const actual = actualInputs[productId];
    const item = reportData.find(r => r.id === productId);
    if (!item || actual === undefined) return 0;
    return actual - item.expected; 
  };

  const handleSaveAdjustments = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
        for (const item of reportData) {
            const actualCount = actualInputs[item.id];
            const variance = actualCount - item.expected;
            if (variance !== 0) {
                await supabase.from('products').update({ stock: actualCount }).eq('id', item.id);
                await supabase.from('stock_movements').insert({
                    organization_id: organizationId,
                    product_id: item.id,
                    quantity: variance, type: 'adjustment',
                    shift_id: currentShift.id,
                    notes: `Shift Adjustment`
                });
            }
        }
        alert("Adjustments Saved!");
        generateReport();
    } catch (err: any) { alert("Error: " + err.message); } 
    finally { setSaving(false); }
  };

  const handleCloseShift = async () => {
      if(!currentShift) return;
      setSaving(true);
      try {
          await shiftService.closeShift(currentShift.id, closingCash, {}, "Closed via Report");
          alert("Shift Closed Successfully!");
          router.push('/shift-history');
      } catch (e: any) {
          alert("Error closing shift: " + e.message);
      } finally {
          setSaving(false);
      }
  };

  const handleExport = () => {
    const data = reportData.map(r => ({
      Product: r.name, Opening: r.opening, Purchases: r.purchased, Sales: r.sold,
      Expected: r.expected, Actual: actualInputs[r.id] ?? r.expected, Variance: getVariance(r.id)
    }));
    exportToCSV(data, `Shift_Report_${currentShift?.id}`);
  };

  if (loading) return <div className="p-8 text-center">Loading Shift Report...</div>;
  
  if (!currentShift && !loading) return (
    <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">No Active Shift</h2>
        <p className="text-gray-500">Please start a shift to see the report.</p>
        <button onClick={() => router.push('/pos')} className="px-6 py-2 bg-black text-white rounded">Go to POS</button>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold">{isClosingShift ? "Close Shift Verification" : "Shift Stock Return"}</h1>
          <p className="text-gray-500 text-sm mt-1">
             Shift started: {new Date(currentShift.opened_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">Export</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow overflow-x-auto printable-area">
        <div className="overflow-x-auto scrollbar-top">
            <div className="scrollbar-top-content min-w-[900px]">
              <table className="w-full text-sm sticky-header">
                <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-semibold">Product</th>
                      <th className="text-center p-3 font-semibold">Opening</th>
                      <th className="text-center p-3 font-semibold text-blue-600 font-bold">Purchases</th>
                      <th className="text-center p-3 font-semibold text-red-600">Sales</th>
                      <th className="text-center p-3 font-semibold">Expected</th>
                      <th className="text-center p-3 font-semibold bg-yellow-50">Actual Count</th>
                      <th className="text-center p-3 font-semibold text-orange-600">Variance</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.map((r, i) => (
                    // FIX: Highlight row if focused
                    <tr 
                      key={i} 
                      className={`transition-colors duration-150 ${
                        focusedRow === r.id 
                          ? 'bg-yellow-100 ring-2 ring-inset ring-yellow-400' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 text-center">{r.opening}</td>
                      <td className="p-3 text-center text-blue-600 font-bold">{r.purchased}</td>
                      <td className="p-3 text-center text-red-600">{r.sold}</td>
                      <td className="p-3 text-center font-bold">{r.expected}</td>
                      <td className="p-2 text-center bg-yellow-50">
                        <input
                          type="number"
                          value={actualInputs[r.id] || 0}
                          onChange={(e) => handleInputChange(r.id, e.target.value)}
                          onFocus={() => setFocusedRow(r.id)} // SET FOCUS
                          onBlur={() => setFocusedRow(null)}  // CLEAR FOCUS
                          className="w-20 p-1 border rounded text-center text-sm font-bold focus:ring-2 focus:ring-black"
                        />
                      </td>
                      <td className={`p-3 text-center font-bold ${getVariance(r.id) === 0 ? 'text-gray-400' : 'text-red-600 bg-red-50'}`}>
                        {getVariance(r.id) > 0 ? `+${getVariance(r.id)}` : getVariance(r.id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t no-print">
            <button 
              onClick={handleSaveAdjustments}
              disabled={saving}
              className="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300"
            >
              {saving ? "Saving..." : "Save Adjustments"}
            </button>

            {isClosingShift && (
              <button 
                onClick={handleCloseShift}
                disabled={saving}
                className="px-8 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:bg-red-300"
              >
                Confirm & Close Shift
              </button>
            )}
      </div>
    </div>
  );
}

export default function DailyStockReturnPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StockReportContent />
    </Suspense>
  );
}