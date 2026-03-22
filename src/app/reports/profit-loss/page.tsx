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
        
        // Calculate COGS from items
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

      const fixedCosts = expenses?.filter(e => e.cost_type === 'fixed').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      const variableCosts = expenses?.filter(e => e.cost_type === 'variable').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
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

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10 py-2 bg-gray-50/80 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-500 text-sm mt-1">Financial performance overview.</p>
        </div>
        <div className="flex gap-2 items-center bg-white p-1 rounded-lg shadow-sm border">
            <button onClick={() => setViewMode('daily')} className={`px-4 py-2 rounded text-sm font-bold transition ${viewMode === 'daily' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Daily</button>
            <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded text-sm font-bold transition ${viewMode === 'monthly' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Monthly</button>
        </div>
      </div>

      {/* Date Selector Card */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
          <p className="text-xs mt-2 opacity-75">
            {report.netProfit >= 0 ? 'Great job! You made a profit.' : 'You operated at a loss this period.'}
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(report.revenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cost of Goods Sold</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(report.cogs)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Operating Expenses</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(report.totalExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50">
          <h3 className="font-bold text-gray-800">Detailed Breakdown</h3>
        </div>

        <div className="p-5 space-y-6">
          
          {/* Revenue Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="font-semibold text-green-800">Gross Revenue</span>
              <span className="font-bold text-green-700 text-lg">{formatCurrency(report.revenue)}</span>
            </div>
          </div>

          {/* COGS Section */}
          <div className="space-y-2 border-l-4 border-blue-500 pl-4 py-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Less: Cost of Goods Sold</span>
              <span className="font-medium text-blue-600">- {formatCurrency(report.cogs)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2 mt-2">
              <span className="font-bold text-gray-900">Gross Profit</span>
              <span className="font-bold text-gray-900">{formatCurrency(report.grossProfit)}</span>
            </div>
          </div>

          {/* Expenses Section */}
          <div className="space-y-2 border-l-4 border-orange-500 pl-4 py-1">
             <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Variable Costs</span>
              <span>- {formatCurrency(report.variableCosts)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Fixed Costs</span>
              <span>- {formatCurrency(report.fixedCosts)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2 mt-2">
              <span className="font-bold text-gray-900">Total Expenses</span>
              <span className="font-bold text-orange-600">- {formatCurrency(report.totalExpenses)}</span>
            </div>
          </div>

          {/* Final Net Profit */}
          <div className={`mt-4 p-4 rounded-xl flex justify-between items-center ${report.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
            <span className="text-white font-bold text-lg">NET PROFIT</span>
            <span className="text-white font-extrabold text-2xl tracking-wide">
              {formatCurrency(report.netProfit)}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}