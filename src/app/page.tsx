 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatCurrency } from "@/components/pos/utils";
import { expenseService } from "@/lib/services/expenseService";
import { LowStockAlert } from "@/components/inventory/LowStockAlert";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";

export default function DashboardPage() {
  const supabase = createClient();
  
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
    pendingPayments: 0,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("total_amount, status");
        
      if (salesError) throw salesError;

      const totalSales = salesData?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
      const pending = salesData?.filter((s: any) => s.status === 'pending').length || 0;
      
      const totalExpenses = await expenseService.getTotalExpensesThisMonth();
      const netProfit = totalSales - totalExpenses;

      setStats({
        totalSales,
        totalExpenses,
        netProfit,
        transactionCount: salesData?.length || 0,
        pendingPayments: pending
      });

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      
      <LowStockAlert />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Financial overview of your business.</p>
        </div>
        <Link 
          href="/pos"
          className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition shadow-lg text-sm"
        >
          Open POS Terminal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-40">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(stats.totalSales)}</p>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4">
            <p className="text-xs text-gray-400">{stats.transactionCount} transactions</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-40">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500 tracking-tight">{formatCurrency(stats.totalExpenses)}</p>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4">
            <Link href="/expenses" className="text-xs text-blue-600 hover:underline">View details</Link>
          </div>
        </div>

        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-between h-40 ${stats.netProfit >= 0 ? 'bg-black text-white' : 'bg-red-50 border-red-200'}`}>
          <div>
            <p className={`text-sm font-medium mb-1 ${stats.netProfit >= 0 ? 'text-gray-300' : 'text-red-500'}`}>Net Profit</p>
            <p className={`text-2xl font-bold tracking-tight ${stats.netProfit >= 0 ? 'text-white' : 'text-red-600'}`}>{formatCurrency(stats.netProfit)}</p>
          </div>
          <div className={`border-t pt-3 mt-4 ${stats.netProfit >= 0 ? 'border-gray-700' : 'border-red-100'}`}>
            <p className={`text-xs ${stats.netProfit >= 0 ? 'text-gray-400' : 'text-red-400'}`}>Revenue minus expenses</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesTrendChart />
        </div>
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/pos" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
                  <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition"><CartIcon className="w-5 h-5 text-gray-700" /></div>
                  <span className="font-medium text-xs text-gray-700">New Sale</span>
                </Link>
                <Link href="/inventory" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
                  <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition"><BoxIcon className="w-5 h-5 text-gray-700" /></div>
                  <span className="font-medium text-xs text-gray-700">Inventory</span>
                </Link>
                <Link href="/reports" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
                  <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition"><ChartIcon className="w-5 h-5 text-gray-700" /></div>
                  <span className="font-medium text-xs text-gray-700">Reports</span>
                </Link>
                <Link href="/expenses" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition group">
                  <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition"><ExpenseIcon className="w-5 h-5 text-gray-700" /></div>
                  <span className="font-medium text-xs text-gray-700">Expenses</span>
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <span className="font-medium text-yellow-800 text-sm">Pending M-Pesa</span>
                  <span className="font-bold text-yellow-800">{stats.pendingPayments}</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function CartIcon(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>; }
function BoxIcon(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>; }
function ChartIcon(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>; }
function ExpenseIcon(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>; }