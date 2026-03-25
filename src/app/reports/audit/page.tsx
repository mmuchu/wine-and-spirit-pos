 // src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";

export default function AuditPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) loadAuditData();
  }, [organizationId]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      // 1. Get Active Shift
      const currentShift = await shiftService.getCurrentShift(organizationId);
      setShift(currentShift);

      if (!currentShift) {
        setLoading(false);
        return;
      }

      // 2. Fetch Sales for this Shift
      const { data: salesData } = await supabase
        .from('sales')
        .select('*')
        .eq('shift_id', currentShift.id)
        .eq('status', 'completed');
      setSales(salesData || []);

      // 3. Fetch Expenses for this Shift
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('shift_id', currentShift.id);
      setExpenses(expensesData || []);

      // 4. Fetch Stock Movements (Purchases) for this Shift
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*, products(name)')
        .eq('shift_id', currentShift.id);
      setStockMovements(movements || []);

    } catch (err) {
      console.error("Audit error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading Audit...</div>;
  if (!shift) return <div className="p-8">No active shift found.</div>;

  // CALCULATIONS
  const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalCashSales = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalMpesaSales = sales.filter(s => s.payment_method === 'mpesa').reduce((sum, s) => sum + (s.total_amount || 0), 0);
  
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const openingCash = shift.opening_cash || 0;
  
  // Expected Cash = Opening + Cash Sales - Expenses
  const expectedCash = openingCash + totalCashSales - totalExpenses;

  const stockPurchases = stockMovements.filter(m => m.type === 'purchase');
  const totalStockCost = stockPurchases.reduce((sum, m) => sum + (m.total_cost || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Audit</h1>
          <p className="text-sm text-gray-500 mt-1">
            Shift started: {new Date(shift.opened_at).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase font-bold">Opening Cash</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(openingCash)}</p>
        </div>
      </div>

      {/* MAIN SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sales Summary */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-600 uppercase text-xs tracking-wider">Sales Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Sales</span>
              <span className="font-bold">{formatCurrency(totalSales)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Cash Sales</span>
              <span className="font-bold">{formatCurrency(totalCashSales)}</span>
            </div>
            <div className="flex justify-between text-purple-600">
              <span>M-Pesa Sales</span>
              <span className="font-bold">{formatCurrency(totalMpesaSales)}</span>
            </div>
          </div>
        </div>

        {/* Expenses Summary */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-600 uppercase text-xs tracking-wider">Expenses Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-red-600">
              <span>Total Expenses</span>
              <span className="font-bold">- {formatCurrency(totalExpenses)}</span>
            </div>
            <div className="pt-2 text-xs text-gray-400 border-t">
              {expenses.length} expense(s) recorded
            </div>
          </div>
        </div>

        {/* Cash Position */}
        <div className="bg-black text-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="font-bold text-gray-300 uppercase text-xs tracking-wider">Expected Cash</h2>
          <div className="text-3xl font-extrabold">
            {formatCurrency(expectedCash)}
          </div>
          <div className="text-[10px] text-gray-400 space-y-1 border-t border-gray-700 pt-2 mt-2">
             <p><span className="font-bold text-gray-200">Calculation:</span></p>
             <p>Opening ({formatCurrency(openingCash)}) + Cash Sales ({formatCurrency(totalCashSales)}) - Expenses ({formatCurrency(totalExpenses)})</p>
          </div>
        </div>

      </div>

      {/* DETAILED EXPENSES TABLE */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">Expense Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No expenses recorded this shift.</td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{new Date(exp.created_at).toLocaleTimeString()}</td>
                    <td className="p-3 font-medium text-gray-800">{exp.category || 'General'}</td>
                    <td className="p-3 text-gray-500">{exp.description || '-'}</td>
                    <td className="p-3 text-right font-bold text-red-600">- {formatCurrency(exp.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED STOCK PURCHASES */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">Stock Purchases (Cash Out)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stockPurchases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No stock purchases recorded.</td>
                </tr>
              ) : (
                stockPurchases.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{new Date(mov.created_at).toLocaleTimeString()}</td>
                    <td className="p-3 font-medium">{mov.products?.name || 'Unknown'}</td>
                    <td className="p-3 text-right">{mov.quantity}</td>
                    <td className="p-3 text-right font-bold text-orange-600">- {formatCurrency(mov.total_cost || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}