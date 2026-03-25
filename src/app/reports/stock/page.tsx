 // src/app/reports/stock/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { useRouter, useSearchParams } from "next/navigation";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// --- Main Page ---
export default function StockReturnPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <StockContent />
    </Suspense>
  );
}

// --- Logic Component ---
function StockContent() {
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
    if (organizationId) loadData();
  }, [organizationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentShift = await shiftService.getCurrentShift(organizationId);
      if (!currentShift) { setLoading(false); return; }
      setShift(currentShift);

      const cashParam = searchParams.get('cash');
      if (cashParam) setClosingCash(parseFloat(cashParam) || 0);
      
      const salesTotal = await shiftService.getShiftSales(currentShift.id, currentShift.opened_at);
      setExpectedCash((currentShift.opening_cash || 0) + salesTotal);

      const { data: products } = await supabase.from('products').select('id, name').eq('organization_id', organizationId).eq('is_active', true).order('name');
      const openingStock: Record<string, number> = currentShift.opening_stock || {};

      const { data: purchases } = await supabase.from('stock_movements').select('product_id, quantity').eq('shift_id', currentShift.id).eq('type', 'purchase');
      const purchaseMap: Record<string, number> = {};
      purchases?.forEach(p => { purchaseMap[p.product_id] = (purchaseMap[p.product_id] || 0) + (p.quantity || 0); });

      const { data: salesData } = await supabase.from('sales').select('items').eq('shift_id', currentShift.id);
      const salesMap: Record<string, number> = {};
      salesData?.forEach(s => { (s.items || []).forEach((i: any) => { salesMap[i.id] = (salesMap[i.id] || 0) + (i.quantity || 0); }); });

      const rows = (products || []).map(p => {
        const op = openingStock[p.id] || 0;
        const pur = purchaseMap[p.id] || 0;
        const sold = salesMap[p.id] || 0;
        const exp = op + pur - sold;
        return { productId: p.id, productName: p.name, opening: op, purchases: pur, sales: sold, expected: exp, actual: exp, variance: 0 };
      });
      setStockRows(rows);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleChange = (productId: string, value: string) => {
    const val = parseFloat(value) || 0;
    setStockRows(prev => prev.map(r => r.productId === productId ? { ...r, actual: val, variance: val - r.expected } : r));
  };

  const handleClose = async () => {
    if (!shift) return;
    if (!confirm("Close shift?")) return;
    setProcessing(true);
    try {
      const snapshot: Record<string, number> = {};
      stockRows.forEach(r => snapshot[r.productId] = r.actual);
      await shiftService.closeShift(shift.id, closingCash, snapshot, notes);
      await Promise.all(stockRows.map(r => supabase.from('products').update({ stock: r.actual }).eq('id', r.productId)));
      alert("Done!");
      router.push('/');
    } catch (e: any) { alert(e.message); } finally { setProcessing(false); }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!shift) return <div className="p-8 text-center"><h1 className="text-xl font-bold">No Active Shift</h1></div>;

  const variance = closingCash - expectedCash;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Daily Stock Return</h1>
      
      {/* Cash */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-bold border-b pb-2">Cash</h2>
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Open</p><p className="font-bold">{formatCurrency(shift.opening_cash || 0)}</p></div>
          <div className="p-2 bg-gray-50 rounded"><p className="text-xs text-gray-500">Sales</p><p className="font-bold">{formatCurrency(expectedCash - (shift.opening_cash || 0))}</p></div>
          <div className="p-2 bg-blue-50 rounded"><p className="text-xs text-blue-600">Expected</p><p className="font-bold text-blue-700">{formatCurrency(expectedCash)}</p></div>
          <div className="p-2 bg-green-50 rounded"><p className="text-xs text-green-600">Actual</p>
            <input type="number" value={closingCash} onChange={e => setClosingCash(parseFloat(e.target.value)||0)} className="w-full bg-transparent text-center font-bold" />
          </div>
        </div>
        <div className={`p-2 text-center rounded font-bold ${Math.abs(variance) > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          Variance: {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
        </div>
      </div>

      {/* Stock */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b bg-gray-50 font-bold">Stock Count</div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-gray-100">Product</th>
                <th className="p-2 text-center">Op</th>
                <th className="p-2 text-center">In</th>
                <th className="p-2 text-center">Out</th>
                <th className="p-2 text-center bg-blue-50 text-blue-700">Exp</th>
                <th className="p-2 text-center bg-green-50 text-green-700">Actual</th>
                <th className="p-2 text-center bg-red-50 text-red-700">Var</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stockRows.map(r => (
                <tr key={r.productId}>
                  <td className="p-2 sticky left-0 bg-white font-medium">{r.productName}</td>
                  <td className="p-2 text-center text-gray-500">{r.opening}</td>
                  <td className="p-2 text-center text-gray-500">{r.purchases}</td>
                  <td className="p-2 text-center text-gray-500">{r.sales}</td>
                  <td className="p-2 text-center font-bold bg-blue-50">{r.expected}</td>
                  <td className="p-1 bg-green-50"><input type="number" value={r.actual} onChange={e => handleChange(r.productId, e.target.value)} className="w-full p-1 border rounded text-center font-bold" /></td>
                  <td className={`p-2 text-center font-bold ${r.variance > 0 ? 'text-green-600' : r.variance < 0 ? 'text-red-600' : 'text-gray-400'}`}>{r.variance > 0 ? '+' : ''}{r.variance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-lg text-sm" rows={2} placeholder="Notes..." />
        <button onClick={handleClose} disabled={processing} className="w-full py-4 bg-red-600 text-white rounded-xl font-bold disabled:bg-gray-300">
          {processing ? "Processing..." : "Close Shift"}
        </button>
      </div>
    </div>
  );
}