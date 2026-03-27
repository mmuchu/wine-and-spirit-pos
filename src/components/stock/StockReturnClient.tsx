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

  // State for Categories
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId]);

  const load = async () => {
    setLoading(true);
    try {
      const s = await shiftService.getCurrentShift(organizationId);
      if (!s) { setLoading(false); return; }
      setShift(s);

      const salesTotal = await shiftService.getShiftSales(s.id, s.opened_at);
      setExpectedCash((s.opening_cash || 0) + salesTotal);

      // 1. Fetch Products with Category Name
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, stock, cost_price, category_id, categories(name)')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      // 2. Build Category List (Names, not IDs)
      const cats = new Set<string>();
      prods?.forEach(p => {
        // Access nested category name. Fallback to 'Other' if null.
        const catName = (p.categories as any)?.name || 'Other';
        cats.add(catName);
      });
      setCategories(["All", ...Array.from(cats)]);

      const opStock: Record<string, number> = s.opening_stock || {};
      
      const { data: purch } = await supabase
        .from('stock_movements')
        .select('product_id, quantity')
        .eq('shift_id', s.id)
        .eq('type', 'purchase');

      const pMap: Record<string, number> = {};
      purch?.forEach(p => { pMap[p.product_id] = (pMap[p.product_id]||0) + (p.quantity||0); });

      const { data: salesData } = await supabase
        .from('sales')
        .select('items')
        .eq('shift_id', s.id)
        .eq('status', 'completed');

      const sMap: Record<string, number> = {};
      salesData?.forEach(sale => {
        (sale.items||[]).forEach((i: any) => { sMap[i.id] = (sMap[i.id]||0) + (i.quantity||0); });
      });

      // 3. Map Rows with Category Name
      const rows = (prods||[]).map(p => {
        const o = opStock[p.id] ?? p.stock;
        const pQty = pMap[p.id] || 0;
        const sQty = sMap[p.id] || 0;
        const expected = o + pQty - sQty;
        const catName = (p.categories as any)?.name || 'Other';
        
        return {
          productId: p.id,
          name: p.name,
          category: catName, // Use Name
          costPrice: p.cost_price || 0,
          opening: o,
          purchases: pQty,
          sales: sQty,
          expected: expected,
          actual: expected,
          variance: 0,
          isVarianceOk: true
        };
      });

      setStockRows(rows);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // Filter Logic
  const filteredRows = activeCategory === "All" 
    ? stockRows 
    : stockRows.filter(r => r.category === activeCategory);

  const upd = (id: string, val: string) => {
    const v = parseFloat(val)||0;
    setStockRows(prev => prev.map(r => {
      if(r.productId === id) {
        const varN = r.expected - v;
        return { ...r, actual: v, variance: varN, isVarianceOk: Math.abs(varN) < 0.01 };
      }
      return r;
    }));
  };

  const close = async () => {
    if(!shift) return;
    if(!confirm("Close Shift?")) return;
    setProcessing(true);
    try {
      const snap: Record<string, number> = {};
      stockRows.forEach(r => snap[r.productId] = r.actual);
      await shiftService.closeShift(shift.id, closingCash, snap, notes);
      await Promise.all(stockRows.map(r => 
        supabase.from('products').update({ stock: r.actual }).eq('id', r.productId)
      ));
      alert("Shift Closed!");
      window.location.href = '/';
    } catch (e: any) { alert(e.message); } 
    finally { setProcessing(false); }
  };

  if(loading) return <div className="p-8">Loading...</div>;
  if(!shift) return <div className="p-8 text-center"><h1 className="text-xl font-bold">No Active Shift</h1></div>;

  const cashVar = closingCash - expectedCash;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Daily Stock Return</h1>
        <div className="text-right">
          <p className="text-xs text-gray-400">Expected</p>
          <p className="font-bold">{formatCurrency(expectedCash)}</p>
        </div>
      </div>
      
      {/* Cash Section */}
      <div className="bg-white p-4 rounded shadow flex items-center gap-4">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Actual Cash in Drawer</label>
          <input 
            type="number" 
            value={closingCash} 
            onChange={e=>setClosingCash(parseFloat(e.target.value)||0)} 
            className="w-full border p-2 rounded text-lg font-bold" 
          />
        </div>
        <div className={`px-4 py-2 rounded ${Math.abs(cashVar)>10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          Variance: {formatCurrency(cashVar)}
        </div>
      </div>

      {/* HORIZONTAL SCROLL CATEGORIES (Now shows Names) */}
      <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${activeCategory === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="overflow-y-auto max-h-[400px]">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-gray-100">Product</th>
                <th className="p-2 text-center">Op</th>
                <th className="p-2 text-center">Purc</th>
                <th className="p-2 text-center">Sales</th>
                <th className="p-2 text-center">Exp</th>
                <th className="p-2 text-center bg-green-50">Act</th>
                <th className="p-2 text-center">Var</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRows.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-gray-400">No products in this category.</td></tr>
              )}
              {filteredRows.map(r => (
                <tr key={r.productId} className={!r.isVarianceOk ? 'bg-red-50' : ''}>
                  <td className="p-2 font-medium sticky left-0 bg-white">{r.name}</td>
                  <td className="p-2 text-center text-gray-500">{r.opening}</td>
                  <td className="p-2 text-center text-gray-500">{r.purchases}</td>
                  <td className="p-2 text-center text-gray-500">{r.sales}</td>
                  <td className="p-2 text-center font-bold">{r.expected}</td>
                  <td className="p-1 bg-green-50">
                    <input 
                      type="number" 
                      value={r.actual} 
                      onChange={e=>upd(r.productId, e.target.value)} 
                      className="w-12 p-1 border rounded text-center font-bold" 
                    />
                  </td>
                  <td className={`p-2 text-center font-bold ${r.variance?'text-red-600 font-bold':'text-gray-300'}`}>
                    {r.variance > 0 ? `+${r.variance}` : r.variance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes..." className="w-full p-2 border rounded text-sm" rows={1} />
      
      <button onClick={close} disabled={processing} className="w-full py-3 bg-red-600 text-white rounded font-bold text-sm">
        {processing ? "Processing..." : "Close Shift"}
      </button>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}