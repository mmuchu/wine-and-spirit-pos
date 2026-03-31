 // src/app/reports/profit-loss/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

type ExpenseCategory = {
  category: string;
  amount: number;
  cost_type: 'fixed' | 'variable';
};

type ReportData = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  fixedCosts: number;
  variableCosts: number;
  totalExpenses: number;
  netProfit: number;
  expensesByCategory: ExpenseCategory[];
};

export default function ProfitLossPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [report, setReport] = useState<ReportData>({
    revenue: 0, cogs: 0, grossProfit: 0, fixedCosts: 0, variableCosts: 0, totalExpenses: 0, netProfit: 0, expensesByCategory: []
  });

  // NEW: State for raw data for modals
  const [salesData, setSalesData] = useState<any[]>([]);
  const [activeBreakdown, setActiveBreakdown] = useState<'revenue' | 'cogs' | 'expenses' | null>(null);

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
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(`${month}-01`);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
      }

      // 1. Fetch Sales
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id, created_at, total_amount, items, payment_method")
        .eq("organization_id", organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;
      
      // NEW: Store raw sales data for modal
      setSalesData(sales || []);

      let totalRevenue = 0;
      let cogs = 0;

      sales?.forEach((sale: any) => {
        totalRevenue += sale.total_amount || 0;
        sale.items?.forEach((item: any) => {
          const cost = Number(item.cost_price) || 0;
          cogs += cost * item.quantity;
        });
      });

      const grossProfit = totalRevenue - cogs;

      // 2. Fetch Expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, cost_type, category')
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;

      // Calculate Categories
      const categoryMap = new Map<string, { amount: number; cost_type: string }>();
      expenses?.forEach((expense: any) => {
        const category = expense.category || 'General';
        const existing = categoryMap.get(category) || { amount: 0, cost_type: expense.cost_type };
        existing.amount += expense.amount || 0;
        categoryMap.set(category, existing);
      });

      const expensesByCategory: ExpenseCategory[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category, amount: data.amount, cost_type: data.cost_type as 'fixed' | 'variable'
        }))
        .sort((a, b) => b.amount - a.amount);

      const fixedCosts = expensesByCategory.filter(e => e.cost_type === 'fixed').reduce((sum, e) => sum + e.amount, 0);
      const variableCosts = expensesByCategory.filter(e => e.cost_type === 'variable').reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = fixedCosts + variableCosts;

      setReport({
        revenue: totalRevenue, cogs, grossProfit, fixedCosts, variableCosts, totalExpenses,
        netProfit: grossProfit - totalExpenses, expensesByCategory
      });

    } catch (err) {
      console.error("Failed to generate report", err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Render Modal Content
  const renderBreakdownContent = () => {
    if (!activeBreakdown) return null;

    let title = "";
    let content = null;

    if (activeBreakdown === 'revenue') {
      title = "Revenue Breakdown (Sales)";
      content = (
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {salesData.map((s) => (
              <tr key={s.id}>
                <td className="p-3">{new Date(s.created_at).toLocaleTimeString()}</td>
                <td className="p-3">{s.payment_method?.toUpperCase()}</td>
                <td className="p-3 text-right font-bold text-green-600">+ {formatCurrency(s.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (activeBreakdown === 'cogs') {
      title = "Cost of Goods Sold (COGS)";
      content = (
        <div className="p-4 text-center text-gray-600">
          <p className="mb-2">Total COGS: <strong>{formatCurrency(report.cogs)}</strong></p>
          <p className="text-xs text-gray-400">Derived from item cost prices in sales transactions.</p>
          <div className="mt-4 max-h-60 overflow-y-auto text-left">
             <table className="w-full text-xs">
               <thead className="bg-gray-50">
                 <tr>
                   <th className="p-2">Sale ID</th>
                   <th className="p-2">Time</th>
                   <th className="p-2">Items</th>
                   <th className="p-2 text-right">Total Cost</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {salesData.map((s) => {
                   const saleCogs = s.items?.reduce((sum: number, i: any) => sum + ((Number(i.cost_price) || 0) * i.quantity), 0) || 0;
                   return (
                     <tr key={s.id}>
                       <td className="p-2 font-mono">{s.id.slice(0,8)}...</td>
                       <td className="p-2">{new Date(s.created_at).toLocaleTimeString()}</td>
                       <td className="p-2">{s.items?.length || 0} items</td>
                       <td className="p-2 text-right font-bold text-blue-600">- {formatCurrency(saleCogs)}</td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
          </div>
        </div>
      );
    } else if (activeBreakdown === 'expenses') {
      title = "Expenses Breakdown by Category";
      content = (
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase">
            <tr>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.expensesByCategory.map((e, idx) => (
              <tr key={idx}>
                <td className="p-3 font-medium">{e.category}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${e.cost_type === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{e.cost_type}</span></td>
                <td className="p-3 text-right font-bold text-red-600">- {formatCurrency(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={() => setActiveBreakdown(null)} className="text-gray-500 hover:text-black text-2xl font-bold">&times;</button>
          </div>
          <div className="p-4 overflow-auto flex-1">
            {content}
          </div>
        </div>
      </div>
    );
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      const headers = ['Category', 'Amount (KES)', 'Type', 'Revenue', 'COGS', 'Gross Profit', 'Fixed Costs', 'Variable Costs', 'Net Profit'];
      const rows = report.expensesByCategory.map(cat => `${cat.category},${cat.amount},${cat.cost_type},,,,`);
      rows.push(`,,,,${report.revenue},${report.cogs},${report.grossProfit},${report.fixedCosts},${report.variableCosts},${report.netProfit}`);
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `P&L_${viewMode}_${viewMode === 'daily' ? date : month}.csv`;
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="p-8">Generating Report...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 space-y-6">
      {/* Modal Render */}
      {renderBreakdownContent()}

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10 py-2 bg-gray-50/80 backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-500 text-sm mt-1">
            {viewMode === 'daily' ? `Report for ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : `Monthly Report for ${new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="bg-white p-1 rounded-lg shadow-sm border">
            <button onClick={() => setViewMode('daily')} className={`px-4 py-2 rounded text-sm font-bold transition ${viewMode === 'daily' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Daily</button>
            <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 rounded text-sm font-bold transition ${viewMode === 'monthly' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Monthly</button>
          </div>
          <button onClick={exportReport} disabled={exporting} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
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
          <h2 className="text-4xl font-extrabold mt-1 tracking-tight">{formatCurrency(report.netProfit)}</h2>
        </div>
      </div>

      {/* Quick Stats Grid - NOW CLICKABLE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div onClick={() => setActiveBreakdown('revenue')} className="bg-white p-5 rounded-xl border shadow-sm cursor-pointer hover:border-green-400 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(report.revenue)}</p>
            </div>
          </div>
        </div>

        <div onClick={() => setActiveBreakdown('cogs')} className="bg-white p-5 rounded-xl border shadow-sm cursor-pointer hover:border-blue-400 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cost of Goods Sold</p>
              <p className="text-lg font-bold">{formatCurrency(report.cogs)}</p>
            </div>
          </div>
        </div>

        <div onClick={() => setActiveBreakdown('expenses')} className="bg-white p-5 rounded-xl border shadow-sm cursor-pointer hover:border-orange-400 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Operating Expenses</p>
              <p className="text-lg font-bold">{formatCurrency(report.totalExpenses)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown (Keep as is) */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-gray-50">
          <h3 className="font-bold">Detailed Breakdown</h3>
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
            <div className="mb-2">
              <div className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                <span>Fixed Costs</span>
                <span className="text-gray-900">- {formatCurrency(report.fixedCosts)}</span>
              </div>
              <div className="pl-4 space-y-1">
                {report.expensesByCategory.filter(e => e.cost_type === 'fixed').map((expense, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-gray-600">
                    <span>{expense.category}</span>
                    <span>- {formatCurrency(expense.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center text-sm font-medium text-gray-700 mb-1">
                <span>Variable Costs</span>
                <span className="text-gray-900">- {formatCurrency(report.variableCosts)}</span>
              </div>
              <div className="pl-4 space-y-1">
                {report.expensesByCategory.filter(e => e.cost_type === 'variable').map((expense, idx) => (
                  <div key={idx} className="flex justify-between text-sm text-gray-600">
                    <span>{expense.category}</span>
                    <span>- {formatCurrency(expense.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center border-t pt-2 mt-2">
              <span className="font-bold text-gray-900">Total Expenses</span>
              <span className="font-bold text-orange-600">- {formatCurrency(report.totalExpenses)}</span>
            </div>
          </div>

          {/* Final Net Profit */}
          <div className={`mt-4 p-4 rounded-xl flex justify-between items-center ${report.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
            <span className="text-white font-bold text-lg">NET PROFIT</span>
            <span className="text-white font-extrabold text-2xl tracking-wide">{formatCurrency(report.netProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}