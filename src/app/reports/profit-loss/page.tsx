 // src/app/reports/profit-loss/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function ProfitLossPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const [report, setReport] = useState({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    fixedCosts: 0,
    variableCosts: 0,
    totalExpenses: 0,
    netProfit: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) fetchReport();
  }, [organizationId, viewMode, date, month]);

  const fetchReport = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      let startDate, endDate;

      if (viewMode === 'daily') {
        startDate = new Date(date);
        startDate.setHours(0,0,0,0);
        endDate = new Date(date);
        endDate.setHours(23,59,59,999);
      } else {
        startDate = new Date(`${month}-01`);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
      }

      // 1. Fetch Sales Revenue
      const { data: sales } = await supabase
        .from("sales")
        .select("total_amount, items")
        .eq("organization_id", organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const revenue = sales?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
      
      // CALCULATE COGS
      let cogs = 0;
      // FIX: Added : any to sale
      sales?.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          cogs += (item.cost_price || 0) * item.quantity;
        });
      });

      const grossProfit = revenue - cogs;

      // 2. Fetch Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, cost_type')
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      const fixedCosts = expenses?.filter(e => e.cost_type === 'fixed').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      const variableCosts = expenses?.filter(e => e.cost_type === 'variable').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      const totalExpenses = fixedCosts + variableCosts;

      setReport({
        revenue,
        cogs,
        grossProfit,
        fixedCosts,
        variableCosts,
        totalExpenses,
        netProfit: grossProfit - totalExpenses
      });

    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Generating Report...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
          <p className="text-gray-500 text-sm mt-1">Net Profit Calculation & Analysis.</p>
        </div>
        <div className="flex gap-2 items-center">
            <button onClick={() => setViewMode('daily')} className={`px-4 py-2 rounded text-sm font-bold ${viewMode === 'daily' ? 'bg-black text-white' : 'bg-gray-100'}`}>Daily</button>
            <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded text-sm font-bold ${viewMode === 'monthly' ? 'bg-black text-white' : 'bg-gray-100'}`}>Monthly</button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        {viewMode === 'daily' ? (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded" />
        ) : (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="p-2 border rounded" />
        )}
      </div>

      {/* Report Card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 bg-gray-50 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {viewMode === 'daily' ? `Report for ${new Date(date).toDateString()}` : `Report for ${month}`}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Revenue */}
          <div className="flex justify-between items-center border-b pb-3">
            <span className="text-gray-600 font-medium">Total Revenue (Sales)</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(report.revenue)}</span>
          </div>

          {/* Expenses Breakdown */}
          <div className="space-y-2 pl-4">
            <p className="text-sm font-semibold text-gray-500">Less: Operating Expenses</p>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Variable Costs (e.g. Stock, Transport)</span>
              <span className="font-medium text-orange-600">({formatCurrency(report.variableCosts)})</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fixed Costs (e.g. Rent, Salary)</span>
              <span className="font-medium text-blue-600">({formatCurrency(report.fixedCosts)})</span>
            </div>
          </div>

          <div className="flex justify-between items-center border-t pt-3 mt-2">
            <span className="text-gray-600 font-medium">Total Expenses</span>
            <span className="font-bold text-red-500">({formatCurrency(report.totalExpenses)})</span>
          </div>

          {/* Net Profit */}
          <div className={`flex justify-between items-center p-4 rounded-lg mt-4 ${report.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className={`text-lg font-bold ${report.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              NET PROFIT
            </span>
            <span className={`text-2xl font-bold ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(report.netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}