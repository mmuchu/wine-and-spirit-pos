 // src/app/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { expenseService } from "@/lib/services/expenseService";

export default function ReportsPage() {
  const supabase = createClient();
  
  // State for Summary Data
  const [stats, setStats] = useState({
    totalSales: 0,
    totalTax: 0,
    cashSales: 0,
    mpesaSales: 0,
    creditSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
  });
  
  // State for Transactions List
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(2020, 0, 1); // All time
    }
    return startDate.toISOString();
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const startDate = getDateFilter();

      // 1. Fetch Sales
      const { data: salesData, error } = await supabase
        .from("sales")
        .select("id, created_at, total_amount, tax_amount, payment_method, status")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Calculate Sales Stats (Fixed TypeScript "any" issue)
      const totalSales = salesData?.reduce((sum: number, s) => sum + (s.total_amount || 0), 0) || 0;
      const totalTax = salesData?.reduce((sum: number, s) => sum + (s.tax_amount || 0), 0) || 0;
      const cashSales = salesData?.filter(s => s.payment_method === 'Cash').reduce((sum: number, s) => sum + (s.total_amount || 0), 0) || 0;
      const mpesaSales = salesData?.filter(s => s.payment_method === 'M-Pesa').reduce((sum: number, s) => sum + (s.total_amount || 0), 0) || 0;
      const creditSales = salesData?.filter(s => s.payment_method === 'Credit').reduce((sum: number, s) => sum + (s.total_amount || 0), 0) || 0;

      // 3. Fetch Expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', startDate);
      
      const totalExpenses = expensesData?.reduce((sum: number, e) => sum + Number(e.amount), 0) || 0;

      // 4. Set Stats
      setStats({
        totalSales,
        totalTax,
        cashSales,
        mpesaSales,
        creditSales,
        totalExpenses,
        netProfit: totalSales - totalExpenses,
        transactionCount: salesData?.length || 0,
      });

      setSales(salesData || []);

    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive overview of business performance.</p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                dateRange === range 
                  ? "bg-white text-gray-900 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Calculating report data...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-gray-400 uppercase">Total Revenue</p>
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalSales)}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.transactionCount} transactions</p>
            </div>

            {/* Cash Sales */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-gray-400 uppercase">Cash Sales</p>
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.cashSales)}</p>
            </div>

            {/* M-Pesa Sales */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-gray-400 uppercase">M-Pesa</p>
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.mpesaSales)}</p>
            </div>

            {/* Expenses */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <p className="text-xs font-semibold text-gray-400 uppercase">Expenses</p>
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-red-500 mt-2">{formatCurrency(stats.totalExpenses)}</p>
            </div>

          </div>

          {/* Profit & Tax Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {/* Net Profit */}
             <div className={`p-6 rounded-xl border shadow-sm ${stats.netProfit >= 0 ? 'bg-black text-white' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-medium ${stats.netProfit >= 0 ? 'text-gray-300' : 'text-red-500'}`}>Net Profit</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.netProfit)}</p>
                <p className={`text-xs mt-2 ${stats.netProfit >= 0 ? 'text-gray-400' : 'text-red-400'}`}>Revenue minus expenses</p>
             </div>

             {/* Tax Collected */}
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Tax Collected (VAT)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalTax)}</p>
                <p className="text-xs text-gray-400 mt-2">Ready for remittance</p>
             </div>

             {/* Credit Sales */}
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm font-medium text-gray-500">Credit Given (Debts)</p>
                <p className="text-2xl font-bold text-orange-500 mt-1">{formatCurrency(stats.creditSales)}</p>
                <p className="text-xs text-gray-400 mt-2">Outstanding balances</p>
             </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Transaction Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-500">Time</th>
                    <th className="text-left p-4 font-semibold text-gray-500">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-500">Method</th>
                    <th className="text-right p-4 font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400">No transactions for this period.</td>
                    </tr>
                  ) : (
                    sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 whitespace-nowrap text-gray-600">
                          {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            sale.status === 'completed' ? 'bg-green-100 text-green-700' : 
                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                            sale.status === 'credit' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{sale.payment_method}</td>
                        <td className="p-4 text-right font-medium whitespace-nowrap">
                          {formatCurrency(sale.total_amount || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}