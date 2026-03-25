 // src/components/stock/StockReturnClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { useRouter, useSearchParams } from "next/navigation";

export function StockReturnClient() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [shift, setShift] = useState<any>(null);
  const [stockRows, setStockRows] = useState<any[]>([]);
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
      if (!currentShift) { setLoading(false); return; }
      setShift(currentShift);

      const cashParam = searchParams.get('cash');
      if (cashParam) setClosingCash(parseFloat(cashParam) || 0);
      
      const salesTotal = await shiftService.getShiftSales(currentShift.id, currentShift.opened_at);
      const openingCash = Number(currentShift.opening_cash) || 0;
      setExpectedCash(openingCash + salesTotal);

      const { data: products } = await supabase.from('products').select('id, name').eq('organization_id', organizationId).eq('is_active', true).order('name');
      const openingStock: Record<string, number> = currentShift.opening_stock || {};

      const { data: purchases } = await supabase.from('stock_movements').select('product_id, quantity').eq('shift_id', currentShift.id).eq('type', 'purchase');
      const purchaseMap: Record<string, number> = {};
      purchases?.forEach(p => { purchaseMap[p.product_id] = (purchaseMap[p.product_id] || 0) + (p.quantity || 0); });

      const { data: salesData } = await supabase.from('sales').select('items').eq('shift_id', currentShift.id);
      const salesMap: Record<string, number> = {};
      salesData?.forEach(sale => { (sale.items || []).forEach((item: any) => { salesMap[item.id] = (salesMap[item.id] || 0) + (item.quantity || 0); }); });

      const rows: any[] = (products || []).map(p => {
        const open = openingStock[p.id] || 0;
        const purch = purchaseMap[p.id] || 0;
        const sold = salesMap[p.id] || 0;
        const exp = open + purch - sold;
        return { productId: p.id, productName: p.name, opening: open, purchases: purch, sales: sold, expected: exp, actual: exp, variance: 0 };
      });
      setStockRows(rows);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleActualChange = (productId: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStockRows(prev => prev.map(row => row.productId === productId ? { ...row, actual: val, variance: val - row.expected } : row));
  };

  const handleCloseShift = async () => {
    if (!shift || !organizationId) return;
    if (!confirm("Confirm closing shift?")) return;
    setProcessing(true);
    try {
      const closingSnapshot: Record<string, number> = {};
      stockRows.forEach(r => { closingSnapshot[r.productId] = r.actual; });
      await shiftService.closeShift(shift.id, closingCash, closingSnapshot, notes);
      await Promise.all(stockRows.map(row => supabase.from('products').update({ stock: row.actual }).eq('id', row.productId)));
      alert("Shift closed successfully!");
      router.push('/');
    } catch (err: any) { alert(`Error: ${err.message}`); } 
    finally { setProcessing(false); }
  };

  if (loading) return <div className="p-8">Calculating...</div>;
  if (!shift) return <div className="p-8 text-center"><h2 className="text-xl font-bold">No Active Shift</h2></div>;
  
  const cashVariance = closingCash - expectedCash;

  return (
    <div className="p-6 lg:p-8 max-w-full mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Daily Stock Return</h1>
      
      {/* CASH */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-lg border-b pb-2">Cash Reconciliation</h2>
        <div className="grid grid-cols-4 gap-4 text-center text-sm font-bold">
          <div className="p-2 bg-gray-50 rounded"><p className="text-gray-500 font-normal text-xs">Opening</p><p>{formatCurrency(shift.opening_cash || 0)}</p></div>
          <div className="p-2 bg-gray-50 rounded"><p className="text-gray-500 font-normal text-xs">Sales</p><p>{formatCurrency(expectedCash - (shift.opening_cash || 0))}</p></div>
          <div className="p-2 bg-blue-50 rounded text-blue-800"><p className="font-normal text-xs">Expected</p><p className="text-lg">{formatCurrency(expectedCash)}</p></div>
          <div className="p-2 bg-green-50 rounded text-green-800">
            <p className="font-normal text-xs">Actual</p>
            <input type="number" value={closingCash} onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)} className="w-full bg-transparent text-center text-lg font-bold focus:outline-none" />
          </div>
        </div>
        <div className={`p-3 rounded text-center font-bold ${Math.abs(cashVariance) > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          Variance: {cashVariance >= 0 ? '+' : ''}{formatCurrency(cashVariance)}
        </div>
      </div>

      {/* STOCK */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50"><h2 className="font-bold text-gray-800">Stock Reconciliation</h2></div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-gray-100 z-10">Product</th>
                <th className="p-2 text-center">Op</th><th className="p-2 text-center">Purch</th><th className="p-2 text-center">Sales</th>
                <th className="p-2 text-center font-bold text-blue-700 bg-blue-50">Exp</th>
                <th className="p-2 text-center font-bold text-green-700 bg-green-50">Actual</th>
                <th className="p-2 text-center font-bold text-red-700 bg-red-50">Var</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stockRows.map(r => (
                <tr key={r.productId} className="hover:bg-gray-50">
                  <td className="p-2 font-medium sticky left-0 bg-white z-10">{r.productName}</td>
                  <td className="p-2 text-center text-gray-500">{r.opening}</td>
                  <td className="p-2 text-center text-gray-500">{r.purchases}</td>
                  <td className="p-2 text-center text-gray-500">{r.sales}</td>
                  <td className="p-2 text-center font-bold bg-blue-50">{r.expected}</td>
                  <td className="p-1 bg-green-50"><input type="number" value={r.actual} onChange={(e) => handleActualChange(r.productId, e.target.value)} className="w-full p-1 border rounded text-center font-bold bg-white" /></td>
                  <td className={`p-2 text-center font-bold ${r.variance === 0 ? 'text-gray-400' : (r.variance > 0 ? 'text-green-600' : 'text-red-600')}`}>{r.variance > 0 ? '+' : ''}{r.variance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CLOSE */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 border rounded-lg text-sm" rows={2} placeholder="Notes..." />
        <button onClick={handleCloseShift} disabled={processing} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300">
          {processing ? "Processing..." : "Submit & Close Shift"}
        </button>
      </div>
    </div>
  );
}