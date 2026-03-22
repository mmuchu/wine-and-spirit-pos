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

      // 1. Fetch Sales Data
      const { data: sales, error: sError } = await supabase
        .from("sales")
        .select("total_amount, items")
        .eq("organization_id", organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (sError) throw sError;

      // Calculate Revenue and COGS
      let totalRevenue = 0;
      let cogs = 0;

      sales?.forEach((sale: any) => {
        totalRevenue += sale.total_amount || 0;
        
        sale.items?.forEach((item: any) => {
          cogs += (item.cost_price || 0) * item.quantity;
        });
      });

      const grossProfit = totalRevenue - cogs;

      // 2. Fetch Expenses
      const { data: expenses, error: eError } = await supabase
        .from('expenses')
        .select('amount, cost_type')
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (eError) throw eError;

      // FIX: Explicitly type 'e' as any in both filter and reduce
      const fixedCosts = expenses?.filter((e: any) => e.cost_type === 'fixed').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      const variableCosts = expenses?.filter((e: any) => e.cost_type === 'variable').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      const totalExpenses = fixedCosts + variableCosts;

      setReport({
        revenue: totalRevenue,
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
          <p className="text-gray-500 text-sm mt-1">Net Profit Calculation with COGS.</p>
        </div>
        <div className="flex gap-2 items-center">
            <button onClick={() => setViewMode('daily')} className={`px-4 py-2 rounded text-sm font-bold ${viewMode === 'daily' ? 'bg-black text-white' : 'bg-gray-100'}`}>Daily</button>
            <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded text-sm font-bold ${viewMode === 'monthly' ? 'bg-black text-white' : 'bg-gray-100'}`}>Monthly</button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        {viewMode === 'daily' ? (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-2 border rounded w-full md:w-auto text-sm font-medium" />
        ) : (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="p-2 border rounded w-full md:w-auto text-sm font-medium" />
        )}
      </div>

      {/* Main Summary Hero */}
      <div className={`rounded-2xl p-6 shadow-lg border ${report.netProfit >= 0 ? 'bg-gradient-to-r from-green-600 to-emerald-500 border-green-400' : 'bg-gradient-to-r from-red-600 to-rose-500 border-red-400'}`}>
        <div className="text-white text-center md:text-left">
          <p className="text-sm font-medium opacity-90">
            {viewMode === 'daily' ? `Net Profit for ${new Date(date).toDateString()}` : `Net Profit for ${month}`}
          </p>
          <h2 className="text-4xl font-extrabold mt-1 tracking-tight">
            {formatCurrency(report.netProfit)}
          </h2>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
               {/* Icon */}
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(report.revenue)}</p>
            </div>
          </div>
        </div>
        {/* Other cards... */}
      </div>
      
      {/* Detailed breakdown... */}
    </div>
  );
}