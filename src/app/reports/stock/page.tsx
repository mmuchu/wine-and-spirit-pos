 // src/app/reports/stock/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { useRouter, useSearchParams } from "next/navigation";

export default function StockReturnPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Shift Data
  const [shift, setShift] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
  
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

      // Check if redirected from Sidebar with closing cash amount
      const cashParam = searchParams.get('cash');
      if (cashParam) setClosingCash(parseFloat(cashParam) || 0);
      
      const noteParam = searchParams.get('notes');
      if (noteParam) setNotes(noteParam);

      // 1. Calculate Expected Cash
      const salesTotal = await shiftService.getShiftSales(currentShift.id, currentShift.opened_at);
      const opening = Number(currentShift.opening_cash) || 0;
      const totalExpected = opening + salesTotal;
      setExpectedCash(totalExpected);

      // 2. Load Products for Stock Count
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, stock, category_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      
      setProducts(prods || []);
      
      // Initialize counts with current system stock
      const counts: Record<string, number> = {};
      prods?.forEach(p => counts[p.id] = p.stock);
      setStockCounts(counts);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCountChange = (productId: string, value: string) => {
    setStockCounts(prev => ({
      ...prev,
      [productId]: parseFloat(value) || 0
    }));
  };

  const handleCloseShift = async () => {
    if (!shift || !organizationId) return;
    
    const confirmed = confirm("Are you sure you want to close this shift? This cannot be undone.");
    if (!confirmed) return;

    setProcessing(true);
    try {
      // 1. Close Shift in DB
      await shiftService.closeShift(shift.id, closingCash, stockCounts, notes);

      // 2. Sync Stock for all items where count differs
      // (Optional: usually you trust the system stock, but if doing physical count adjustments)
      // For now, we just save the snapshot.

      alert("Shift closed successfully!");
      router.push('/'); // Go to dashboard
      
    } catch (err: any) {
      console.error(err);
      alert(`Error closing shift: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8">Loading Shift Data...</div>;
  if (!shift) return <div className="p-8 text-center space-y-4"><h2 className="text-xl font-bold">No Active Shift</h2><p>Start a shift first to perform stock return.</p></div>;

  // Calculate Variance
  const cashVariance = closingCash - expectedCash;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Stock Return</h1>
          <p className="text-sm text-gray-500 mt-1">Shift opened: {new Date(shift.opened_at).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase">Status</p>
          <p className="text-lg font-bold text-emerald-600">Active</p>
        </div>
      </div>

      {/* CASH RECONCILIATION */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-lg border-b pb-2">Cash Reconciliation</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Opening Cash</p>
            <p className="text-xl font-bold">{formatCurrency(shift.opening_cash || 0)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Expected Cash Sales</p>
            <p className="text-xl font-bold">{formatCurrency(expectedCash - (shift.opening_cash || 0))}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-600 font-bold">Expected Total</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(expectedCash)}</p>
          </div>
        </div>

        <div className="pt-4 border-t space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Actual Cash in Drawer</label>
            <input 
              type="number" 
              value={closingCash} 
              onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
              className="w-full p-3 border rounded-lg text-lg font-bold"
            />
          </div>
          
          <div className={`p-4 rounded-lg ${Math.abs(cashVariance) > 10 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">Variance</span>
              <span className={`text-xl font-bold ${Math.abs(cashVariance) > 10 ? 'text-red-600' : 'text-green-600'}`}>
                {cashVariance >= 0 ? '+' : ''}{formatCurrency(cashVariance)}
              </span>
            </div>
            {Math.abs(cashVariance) > 10 && <p className="text-xs text-red-500 mt-1">Large variance detected. Please check cash.</p>}
          </div>
        </div>
      </div>

      {/* STOCK COUNT */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Stock Count (Physical)</h2>
          <p className="text-xs text-gray-500">Update counts if they differ from system stock.</p>
        </div>
        
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3 text-left w-8/12">Product</th>
                <th className="p-3 text-center">System</th>
                <th className="p-3 text-center font-bold bg-yellow-50">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-center text-gray-500">{p.stock}</td>
                  <td className="p-1 bg-yellow-50">
                    <input 
                      type="number"
                      value={stockCounts[p.id] || 0}
                      onChange={(e) => handleCountChange(p.id, e.target.value)}
                      className="w-full p-2 border rounded text-center font-bold bg-white"
                    />
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
          <label className="block text-sm font-medium mb-1">Notes / Explanations</label>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border rounded-lg"
            rows={2}
            placeholder="Any discrepancies or issues to report?"
          />
        </div>

        <button
          onClick={handleCloseShift}
          disabled={processing}
          className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 disabled:bg-gray-300 shadow-lg"
        >
          {processing ? "Closing Shift..." : "Confirm & Close Shift"}
        </button>
      </div>

    </div>
  );
}