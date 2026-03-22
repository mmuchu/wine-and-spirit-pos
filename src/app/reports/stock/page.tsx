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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [isClosingShift, setIsClosingShift] = useState(false);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [currentShift, setCurrentShift] = useState<any>(null);

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
        generateReport();
    }
  }, [organizationId, date]);

  const checkActiveShift = async () => {
    try {
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);
    } catch (err) { console.error("Shift error", err); }
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

      const { data: sales } = await supabase
        .from("sales")
        .select("items")
        .eq("organization_id", organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const { data: purchases } = await supabase
        .from("stock_movements")
        .select("product_id, quantity")
        .eq("organization_id", organizationId)
        .eq("type", "purchase")
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const report = products.map((p: any) => {
        let soldQty = 0;
        sales?.forEach((sale: any) => {
          sale.items?.forEach((item: any) => {
            if (item.id === p.id) soldQty += item.quantity;
          });
        });

        const purchasedQty = purchases
          ?.filter((pur: any) => pur.product_id === p.id)
          .reduce((sum: number, pur: any) => sum + pur.quantity, 0) || 0;

        const closingStock = p.stock || 0;
        const openingStock = closingStock - purchasedQty + soldQty;
        const expectedStock = openingStock + purchasedQty - soldQty;

        return {
          id: p.id, name: p.name,
          opening: openingStock,
          purchased: purchasedQty,
          sold: soldQty,
          expected: expectedStock,
          systemStock: closingStock,
          variance: closingStock - expectedStock
        };
      });

      setReportData(report);

    } catch (err: any) {
      console.error("Report Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
      if(!currentShift) return;
      try {
          await shiftService.closeShift(currentShift.id, closingCash, {}, "Closed via Report Page");
          alert("Shift Closed Successfully!");
          router.push('/shift-history');
      } catch (e: any) {
          alert("Error closing shift: " + e.message);
      }
  };

  const handleExport = () => {
    const data = reportData.map(r => ({
      Product: r.name, Opening: r.opening, Purchases: r.purchased, Sales: r.sold,
      Expected: r.expected, System: r.systemStock, Variance: r.variance
    }));
    exportToCSV(data, `Stock_Return_${date}`);
  };

  if (loading) return <div className="p-8 text-center">Loading Report...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold">{isClosingShift ? "Close Shift Verification" : "Daily Stock Return"}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isClosingShift ? `Verify counts. Cash: ${formatCurrency(closingCash)}` : "Read-only report. Adjust stock in Inventory."}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border p-2 rounded text-sm" />
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">Export</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>}

      <div className="bg-white rounded-xl border shadow overflow-hidden">
        {/* CONTAINER ENABLES VERTICAL SCROLL */}
        <div className="table-container overflow-x-auto">
            <table className="w-full text-sm min-w-[900px] sticky-header">
              <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-center p-3 font-semibold">Opening</th>
                    <th className="text-center p-3 font-semibold text-blue-600 font-bold">Purchases</th>
                    <th className="text-center p-3 font-semibold text-red-600">Sales</th>
                    <th className="text-center p-3 font-semibold">Expected</th>
                    <th className="text-center p-3 font-semibold">System</th>
                    <th className="text-center p-3 font-semibold text-orange-600">Variance</th>
                  </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-center">{r.opening}</td>
                    <td className="p-3 text-center text-blue-600 font-bold">{r.purchased}</td>
                    <td className="p-3 text-center text-red-600">{r.sold}</td>
                    <td className="p-3 text-center font-bold">{r.expected}</td>
                    <td className="p-3 text-center">{r.systemStock}</td>
                    <td className={`p-3 text-center font-bold ${r.variance === 0 ? 'text-gray-400' : 'text-red-600 bg-red-50'}`}>
                      {r.variance > 0 ? `+${r.variance}` : r.variance}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>

      {isClosingShift && (
        <div className="flex justify-end gap-4 pt-4 border-t no-print">
            <button 
              onClick={handleCloseShift}
              className="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800"
            >
              Confirm & Close Shift
            </button>
        </div>
      )}
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