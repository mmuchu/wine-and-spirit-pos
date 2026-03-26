// src/components/stock/StockReturnClient.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";

export function StockReturnClient() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [stockRows, setStockRows] = useState<any[]>([]);
  const [closingCash, setClosingCash] = useState(0);
  const [expectedCash, setExpectedCash] = useState(0);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId]);

  const load = async () => {
    setLoading(true);
    try {
      const s = await shiftService.getCurrentShift(organizationId);
      if (!s) { setLoading(false); return; }
      setShift(s);

      const sales = await shiftService.getShiftSales(s.id, s.opened_at);
      setExpectedCash((s.opening_cash || 0) + sales);

      const { data: prods } = await supabase.from('products').select('id, name').eq('organization_id', organizationId).eq('is_active', true);
      const opStock: Record<string, number> = s.opening_stock || {};

      const { data: purch } = await supabase.from('stock_movements').select('product_id, quantity').eq('shift_id', s.id).eq('type', 'purchase');
      const pMap: Record<string, number> = {};
      purch?.forEach(p => { pMap[p.product_id] = (pMap[p.product_id] || 0) + (p.quantity || 0); });

      const { data: salesData } = await supabase.from('sales').select('items').eq('shift_id', s.id);
      const sMap: Record<string, number> = {};
      salesData?.forEach(sale => { (sale.items || []).forEach((i: any) => { sMap[i.id] = (sMap[i.id] || 0) + (i.quantity || 0); }); });

      setRows((prods || []).map(p => {
        const o = opStock[p.id] || 0;
        const pr = pMap[p.id] || 0;
        const sd = sMap[p.id] || 0;
        return { productId: p.id, name: p.name, opening: o, purchases: pr, sales: sd, expected: o + pr - sd, actual: o + pr - sd, variance: 0 };
      }));
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const setRows = (rows: any[]) => {
    setStockRows(rows);
  }

  const upd = (id: string, val: string) => {
    const v = parseFloat(val) || 0;
    setStockRows(prev => prev.map(r => r.productId === id ? { ...r, actual: v, variance: v - r.expected } : r));
  };

  const close = async () => {
    if (!shift) return;
    if (!confirm("Close Shift?")) return;
    setProcessing(true);
    try {
      const snap: Record<string, number> = {};
      stockRows.forEach(r => snap[r.productId] = r.actual);
      await shiftService.closeShift(shift.id, closingCash, snap, notes);
      await Promise.all(stockRows.map(r => supabase.from('products').update({ stock: r.actual }).eq('id', r.productId)));
      alert("Shift Closed!");
      window.location.href = '/';
    } catch (e: any) { alert(e.message); } 
    finally { setProcessing(false); }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!shift) return <div className="p-8 text-center"><h1 className="text-xl font-bold">No Active Shift</h1></div>;

  const cashVar = closingCash - expectedCash;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Daily Stock Return</h1>
      
      {/* Cash */}
      <div className="bg-white p-4 rounded shadow space-y-2">
        <div className="flex justify-between text-sm"><span>Expected Cash</span><b>{formatCurrency(expectedCash)}</b></div>
        <div className="flex justify-between text-sm">
          <span>Actual Cash</span>
          <input type="number" value={closingCash} onChange={e => setClosingCash(parseFloat(e.target.value) || 0)} className="border p-1 rounded text-right w-32" />
        </div>
        <div className={`text-center p-2 rounded font-bold ${Math.abs(cashVar) > 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          Variance: {formatCurrency(cashVar)}
        </div>
      </div>

      {/* Stock */}
      <div className="bg-white rounded shadow overflow-auto max-h-96">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-center">Exp</th>
              <th className="p-2 text-center bg-green-50">Act</th>
              <th className="p-2 text-center">Var</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stockRows.map(r => (
              <tr key={r.productId}>
                <td className="p-2">{r.name}</td>
                <td className="p-2 text-center">{r.expected}</td>
                <td className="p-1 bg-green-50">
                  <input type="number" value={r.actual} onChange={e => upd(r.productId, e.target.value)} className="w-full p-1 border rounded text-center" />
                </td>
                <td className={`p-2 text-center font-bold ${r.variance ? 'text-red-600' : 'text-gray-400'}`}>
                  {r.variance > 0 ? '+' : ''}{r.variance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." className="w-full p-2 border rounded" rows={2} />
      
      <button onClick={close} disabled={processing} className="w-full py-3 bg-red-600 text-white rounded font-bold">
        {processing ? "Processing..." : "Close Shift"}
      </button>
    </div>
  );
}