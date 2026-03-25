 // src/app/reports/stock/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { useRouter, useSearchParams } from "next/navigation";

// --- Main Page Wrapper with Suspense ---
export default function StockReturnPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading Stock Return...</div>}>
      <StockReturnContent />
    </Suspense>
  );
}

// --- The Actual Component Logic ---
function StockReturnContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Shift Data
  const [shift, setShift] = useState<any>(null);
  const [stockRows, setStockRows] = useState<any[]>([]);
  
  // Closing Details
  const [closingCash, setClosingCash] = useState(0);
  const [expectedCash, setExpectedCash] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (organizationId) loadShiftData();
  }, [organizationId]);

  const loadShiftData = async () => {
    setLoading(true);
    try {
      const currentShift = await shiftService.getCurrentShift(organizationId);
      if (!currentShift) {
        setLoading(false);
        return;
      }
      setShift(currentShift);

      // 1. Get Parameters from URL (Redirected from Sidebar)
      const cashParam = searchParams.get('cash');
      if (cashParam) setClosingCash(parseFloat(cashParam) || 0);
      
      const noteParam = searchParams.get('notes');
      if (noteParam) setNotes(noteParam);

      // 2. Calculate Expected Cash
      const salesTotal = await shiftService.getShiftSales(currentShift.id, currentShift.opened_at);
      const openingCash = Number(currentShift.opening_cash) || 0;
      setExpectedCash(openingCash + salesTotal);

      // 3. Load All Products (Active)
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      // 4. Load Opening Stock Snapshot
      const openingStock: Record<string, number> = currentShift.opening_stock || {};

      // 5. Load Purchases this shift
      const { data: purchases } = await supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('shift_id', currentShift.id)
        .eq('type', 'purchase');

      const purchaseMap: Record<string, number> = {};
      purchases?.forEach(p => {
        purchaseMap[p.product_id] = (purchaseMap[p.product_id] || 0) + (p.quantity || 0);
      });

      // 6. Load Sales this shift (Items)
      const { data: salesData } = await supabase
        .from('sales')
        .select('items')
        .eq('shift_id', currentShift.id);

      const salesMap: Record<string, number> = {};
      salesData?.forEach(sale => {
        const items = sale.items || [];
        items.forEach((item: any) => {
          salesMap[item.id] = (salesMap[item.id] || 0) + (item.quantity || 0);
        });
      });

      // 7. Build Rows
      const rows: any[] = (products || []).map(p => {
        const open = openingStock[p.id] || 0;
        const purch = purchaseMap[p.id] || 0;
        const sold = salesMap[p.id] || 0;
        const exp = open + purch - sold;

        return {
          productId: p.id,
          productName: p.name,
          opening: open,
          purchases: purch,
          sales: sold,
          expected: exp,
          actual: exp, // Default actual to expected
          variance: 0
        };
      });

      setStockRows(rows);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActualChange = (productId: string, value: string) => {
    const val = parseFloat(value) || 0;
    
    setStockRows(prev => 
      prev.map(row => {
        if (row.productId === productId) {
          const variance = val - row.expected;
          return { ...row, actual: val, variance };
        }
        return row;
      })
    );
  };

  const handleCloseShift = async () => {
    if (!shift || !organizationId) return;
    
    const confirmed = confirm("Confirm closing shift? This will adjust system stock to match your actual counts.");
    if (!confirmed) return;

    setProcessing(true);
    try {
      // 1. Prepare closing stock snapshot
      const closingSnapshot: Record<string, number> = {};
      stockRows.forEach(r => {
        closingSnapshot[r.productId] = r.actual;
      });

      // 2. Close Shift
      await shiftService.closeShift(shift.id, closingCash, closingSnapshot, notes);

      // 3. Update Product Stock in DB to match Actual
      const updatePromises = stockRows.map(row => 
        supabase
          .from('products')
          .update({ stock: row.actual })
          .eq('id', row.productId)
      );
      
      await Promise.all(updatePromises);

      alert("Shift closed successfully! Stock levels updated.");
      router.push('/');
      
    } catch (err: any) {
      console.error(err);
      alert(`Error closing shift: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8">Calculating Stock Data...</div>;
  if (!shift) return <div className="p-8 text-center space-y-4"><h2 className="text-xl font-bold">No Active Shift</h2></div>;

  const cashVariance = closingCash - expectedCash;

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Stock Return</h1>
          <p className="text-sm text-gray-500 mt-1">Opened: {new Date(shift.opened_at).toLocaleString()}</p>
        </div>
      </div>

      {/* CASH RECONCILIATION */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-lg border-b pb-2">Cash Reconciliation</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm font-bold">
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-500 font-normal text-xs">Opening</p>
            <p className="text-base">{formatCurrency(shift.opening_cash || 0)}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-500 font-normal text-xs">Sales</p>
            <p className="text-base">{formatCurrency(expectedCash - (shift.opening_cash || 0))}</p>
          </div>
          <div className="p-2 bg-blue-50 rounded text-blue-800">
            <p className="font-normal text-xs">Expected</p>
            <p className="text-lg">{formatCurrency(expectedCash)}</p>
          </div>
          <div className="p-2 bg-green-50 rounded text-green-800">
            <p className="font-normal text-xs">Actual</p>
            <input 
              type="number" 
              value={closingCash} 
              onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent text-center text-lg font-bold focus:outline-none"
            />
          </div>
        </div>

        <div className={`p-3 rounded text-center font-bold ${Math.abs(cashVariance) > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          Cash Variance: {cashVariance >= 0 ? '+' : ''}{formatCurrency(cashVariance)}
        </div>
      </div>

      {/* STOCK RECONCILIATION */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">Stock Reconciliation</h2>
          <p className="text-xs text-gray-500">Formula: Opening + Purchases - Sales = Expected. Variance = Actual - Expected.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr className="text-gray-600">
                <th className="p-2 text-left sticky left-0 bg-gray-100 z-10 min-w-[150px]">Product</th>
                <th className="p-2 text-center">Opening</th>
                <th className="p-2 text-center">Purchases</th>
                <th className="p-2 text-center">Sales</th>
                <th className="p-2 text-center font-bold text-blue-700 bg-blue-50 border-x">Expected</th>
                <th className="p-2 text-center font-bold text-green-700 bg-green-50">Actual</th>
                <th className="p-2 text-center font-bold text-red-700 bg-red-50">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stockRows.map(row => (
                <tr key={row.productId} className="hover:bg-gray-50">
                  <td className="p-2 font-medium sticky left-0 bg-white z-10">{row.productName}</td>
                  <td className="p-2 text-center text-gray-500">{row.opening}</td>
                  <td className="p-2 text-center text-gray-500">{row.purchases}</td>
                  <td className="p-2 text-center text-gray-500">{row.sales}</td>
                  <td className="p-2 text-center font-bold bg-blue-50 border-x">{row.expected}</td>
                  <td className="p-1 bg-green-50">
                    <input 
                      type="number"
                      value={row.actual}
                      onChange={(e) => handleActualChange(row.productId, e.target.value)}
                      className="w-full p-1 border rounded text-center font-bold bg-white"
                    />
                  </td>
                  <td className={`p-2 text-center font-bold ${row.variance === 0 ? 'bg-red-50 text-gray-400' : (row.variance > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}`}>
                    {row.variance > 0 ? '+' : ''}{row.variance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NOTES & CLOSE */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Notes / Explanations for Variances</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            rows={2}
          />
        </div>

        <button
          onClick={handleCloseShift}
          disabled={processing}
          className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300"
        >
          {processing ? "Processing..." : "Submit & Close Shift"}
        </button>
      </div>

    </div>
  );
}