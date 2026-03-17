 // src/app/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { expenseService } from "@/lib/services/expenseService";
import { exportToCSV } from "@/lib/utils/export";

// Helper to get date ranges
const getRangeStart = (range: string) => {
  const now = new Date();
  let startDate: Date;

  switch (range) {
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
      startDate = new Date(2020, 0, 1);
  }
  return startDate.toISOString();
};

export default function ReportsPage() {
  const supabase = createClient();
  
  // State for the detailed transaction list (filtered by tab)
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // State for the Comparative Summary Table (All periods at once)
  const [summaryData, setSummaryData] = useState({
    today: { revenue: 0, cogs: 0, profit: 0 },
    week: { revenue: 0, cogs: 0, profit: 0 },
    month: { revenue: 0, cogs: 0, profit: 0 },
    all: { revenue: 0, cogs: 0, profit: 0 },
  });

  useEffect(() => {
    fetchAllSummaryData();
  }, []);

  // Fetch detailed list when tab changes
  useEffect(() => {
    fetchDetailedList(dateRange);
  }, [dateRange]);

  // 1. Fetch High-Level Stats for ALL periods in parallel
  const fetchAllSummaryData = async () => {
    try {
      const ranges = ['today', 'week', 'month', 'all'];
      
      const promises = ranges.map(async (range) => {
        const startDate = getRangeStart(range);
        
        // Fetch Sales
        const { data: salesData } = await supabase
          .from("sales")
          .select("total_amount, cogs_amount")
          .gte("created_at", startDate);
          
        const revenue = salesData?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
        const cogs = salesData?.reduce((sum: number, s: any) => sum + (s.cogs_amount || 0), 0) || 0;
        
        return { range, revenue, cogs, profit: revenue - cogs };
      });

      const results = await Promise.all(promises);
      
      // Map results to state
      const newSummary: any = {};
      results.forEach(r => newSummary[r.range] = { revenue: r.revenue, cogs: r.cogs, profit: r.profit });
      
      setSummaryData(newSummary);
      
    } catch (err) {
      console.error("Error fetching summary", err);
    }
  };

  // 2. Fetch Detailed Transaction List for the selected tab
  const fetchDetailedList = async (range: string) => {
    setLoading(true);
    try {
      const startDate = getRangeStart(range);
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, total_amount, tax_amount, payment_method, status, cogs_amount")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (sales.length === 0) {
      alert("No data to export.");
      return;
    }
    const dataToExport = sales.map(sale => ({
      Date: new Date(sale.created_at).toLocaleString(),
      Receipt_ID: sale.id.slice(0, 8).toUpperCase(),
      Payment_Method: sale.payment_method,
      Status: sale.status,
      Total_Amount: sale.total_amount?.toFixed(2) || '0.00',
      COGS_Amount: sale.cogs_amount?.toFixed(2) || '0.00',
    }));
    exportToCSV(dataToExport, `Sales_Report_${dateRange}`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Comparative profit analysis.</p>
        </div>
        <button 
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition shadow-sm"
        >
          Export to CSV
        </button>
      </div>

      {/* --- NEW: Comparative Summary Table --- */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">Period</th>
              <th className="text-right p-4 font-semibold text-gray-600">Revenue</th>
              <th className="text-right p-4 font-semibold text-gray-600">Cost (COGS)</th>
              <th className="text-right p-4 font-semibold text-gray-600">Gross Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {/* Today Row */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-bold">Today</td>
              <td className="p-4 text-right">{formatCurrency(summaryData.today.revenue)}</td>
              <td className="p-4 text-right text-gray-500">{formatCurrency(summaryData.today.cogs)}</td>
              <td className="p-4 text-right font-bold text-green-600">{formatCurrency(summaryData.today.profit)}</td>
            </tr>
            {/* Week Row */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-bold">This Week</td>
              <td className="p-4 text-right">{formatCurrency(summaryData.week.revenue)}</td>
              <td className="p-4 text-right text-gray-500">{formatCurrency(summaryData.week.cogs)}</td>
              <td className="p-4 text-right font-bold text-green-600">{formatCurrency(summaryData.week.profit)}</td>
            </tr>
            {/* Month Row */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 font-bold">This Month</td>
              <td className="p-4 text-right">{formatCurrency(summaryData.month.revenue)}</td>
              <td className="p-4 text-right text-gray-500">{formatCurrency(summaryData.month.cogs)}</td>
              <td className="p-4 text-right font-bold text-green-600">{formatCurrency(summaryData.month.profit)}</td>
            </tr>
            {/* All Time Row */}
            <tr className="bg-gray-50 hover:bg-gray-100">
              <td className="p-4 font-bold">All Time</td>
              <td className="p-4 text-right font-bold">{formatCurrency(summaryData.all.revenue)}</td>
              <td className="p-4 text-right font-bold text-gray-600">{formatCurrency(summaryData.all.cogs)}</td>
              <td className="p-4 text-right font-bold text-blue-600">{formatCurrency(summaryData.all.profit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transaction List Section */}
      <div className="flex gap-2 border-b pb-3">
        {(['today', 'week', 'month', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
              dateRange === range 
                ? "bg-black text-white shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No transactions found.</td></tr>
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
    </div>
  );
}