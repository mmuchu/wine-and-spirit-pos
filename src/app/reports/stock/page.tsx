 // src/app/reports/stock/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { exportToCSV } from "@/lib/utils/export";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { useRouter, useSearchParams } from "next/navigation";

export default function DailyStockReturnPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [reportData, setReportData] = useState<any[]>([]);
  const [actualInputs, setActualInputs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Shift Closing State
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [currentShift, setCurrentShift] = useState<any>(null);

  useEffect(() => {
    // Check if we are in "Closing Shift" mode from redirect
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
        generateReport();
    }
  }, [organizationId, date]);

  const checkActiveShift = async () => {
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
      
      // If we are trying to close but no active shift found, force back to dashboard
      if (isClosingShift && !shift) {
          alert("No active shift found to close. Redirecting...");
          router.push('/');
      }
    } catch (err) {
      console.error("Error checking shift:", err);
    }
  };

  const generateReport = async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data: products, error: pError } = await supabase
        .from("products")
        .select("id, name, stock") 
      
      if (pError) throw new Error(`Products Error: ${pError.message}`);
      if (!products) throw new Error("No products found.");

      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);

      const { data: sales, error: sError } = await supabase
        .from("sales")
        .select("items")
        .eq("organization_id", organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (sError) throw new Error(`Sales Error: ${sError.message}`);

      const { data: purchases, error: purError } = await supabase
        .from("stock_movements")
        .select("product_id, quantity")
        .eq("organization_id", organizationId)
        .eq("type", "purchase")
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (purError) throw new Error(`Purchases Error: ${purError.message}`);

      const report = products.map(p => {
        let soldQty = 0;
        sales?.forEach(sale => {
          sale.items?.forEach((item: any) => {
            if (item.id === p.id) soldQty += item.quantity;
          });
        });

        const purchasedQty = purchases
          ?.filter(pur => pur.product_id === p.id)
          .reduce((sum, pur) => sum + pur.quantity, 0) || 0;

        const closingStock = p.stock || 0;
        const openingStock = closingStock + soldQty - purchasedQty;
        const expectedStock = openingStock + purchasedQty - soldQty;

        return {
          id: p.id,
          name: p.name,
          opening: openingStock,
          purchased: purchasedQty,
          sold: soldQty,
          expected: expectedStock, // This is System Stock
          systemStock: closingStock
        };
      });

      setReportData(report);

      // Initialize inputs with Expected values
      const initialInputs: Record<string, number> = {};
      report.forEach(r => { initialInputs[r.id] = r.expected; });
      setActualInputs(initialInputs);

    } catch (err: any) {
      console.error("Stock Report Error:", err);
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

  // --- MAIN ACTION ---
  const handleSaveAndClose = async () => {
    // 1. Validation
    if (!organizationId) {
        alert("Error: Organization ID is missing.");
        return;
    }
    
    if (isClosingShift && !currentShift) {
        alert("Error: No active shift found to close.");
        return;
    }

    setSaving(true);
    try {
      // 2. Identify adjustments
      const adjustments = reportData.filter(r => {
        const actual = actualInputs[r.id];
        return actual !== r.expected;
      });

      // 3. Update Product Stock in DB (Closing Stock -> Opening Stock for next shift)
      for (const item of adjustments) {
        const actual = actualInputs[item.id];
        const variance = actual - item.expected;

        // Update products table
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: actual })
          .eq('id', item.id);
        
        if (updateError) throw updateError;

        // Log movement if variance exists
        if (variance !== 0) {
          await supabase.from('stock_movements').insert({
            product_id: item.id,
            quantity: variance,
            type: 'adjustment',
            notes: `Shift Closing Adjustment`,
            organization_id: organizationId
          });
        }
      }

      // 4. If Closing Shift, record the shift closure
      if (isClosingShift && currentShift) {
        const notes = searchParams.get('notes') || "";
        await shiftService.closeShift(
          currentShift.id, 
          closingCash, 
          actualInputs, // Save the stock snapshot
          notes
        );
        
        alert("Shift Closed & Stock Updated successfully!");
        router.push('/shift-history'); // Redirect to history
      } else {
        alert("Stock Adjustments Saved!");
        generateReport(); // Refresh
      }

    } catch (err: any) {
      console.error(err);
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const data = reportData.map(r => ({
      Product: r.name,
      Opening: r.opening,
      Purchases: r.purchased,
      Sales: r.sold,
      Expected: r.expected,
      Actual: actualInputs[r.id] ?? r.expected,
      Variance: getVariance(r.id)
    }));
    exportToCSV(data, `Stock_Return_${date}`);
  };

  if (loading) return <div className="p-8 text-center">Loading Stock Data...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold">
            {isClosingShift ? "Close Shift & Stock Take" : "Daily Stock Return"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isClosingShift 
              ? `Enter counted stock to close shift. Cash Count: ${formatCurrency(closingCash)}` 
              : "Record physical count to update system stock."}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 border-gray-200 rounded text-sm"
            disabled={isClosingShift} 
          />
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">Export</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error Loading Report</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow overflow-x-auto printable-area">
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 border-b">
                <tr>
                <th className="text-left p-3 font-semibold">Product</th>
                <th className="text-center p-3 font-semibold">Opening</th>
                <th className="text-center p-3 font-semibold text-blue-600">Purchases</th>
                <th className="text-center p-3 font-semibold text-red-600">Sales</th>
                <th className="text-center p-3 font-semibold">Expected</th>
                <th className="text-center p-3 font-semibold bg-yellow-50">Actual (Count)</th>
                <th className="text-center p-3 font-semibold text-orange-600">Variance</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {reportData.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No products found.</td></tr>
                ) : (
                reportData.map((r, i) => {
                    const variance = getVariance(r.id);
                    const actualValue = actualInputs[r.id] ?? r.expected;
                    
                    return (
                    <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3 text-center">{r.opening}</td>
                        <td className="p-3 text-center text-blue-600 font-bold">{r.purchased}</td>
                        <td className="p-3 text-center text-red-600 font-bold">{r.sold}</td>
                        <td className="p-3 text-center font-bold">{r.expected}</td>
                        <td className="p-2 text-center bg-yellow-50">
                        <input 
                            type="number"
                            value={actualValue}
                            onChange={(e) => handleInputChange(r.id, e.target.value)}
                            className="w-20 p-1 border rounded text-center text-sm font-bold focus:ring-2 focus:ring-black"
                        />
                        </td>
                        <td className={`p-3 text-center font-bold ${variance === 0 ? 'text-gray-400' : variance > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                        {variance > 0 ? `+${variance}` : variance}
                        </td>
                    </tr>
                    );
                })
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Combined Action Button */}
      <div className="flex justify-end gap-4 no-print">
        <button 
          onClick={() => router.back()}
          className="px-6 py-3 border rounded-lg font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button 
          onClick={handleSaveAndClose}
          disabled={saving}
          className="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300 shadow-lg"
        >
          {saving ? "Processing..." : isClosingShift ? "Save & Close Shift" : "Save Adjustments"}
        </button>
      </div>
    </div>
  );
}