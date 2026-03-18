 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatCurrency } from "@/components/pos/utils";
import { LowStockAlert } from "@/components/inventory/LowStockAlert";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { usePathname } from "next/navigation";

export default function DashboardPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const pathname = usePathname();
  
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    transactionCount: 0,
    pendingPayments: 0,
  });

  const [shiftStats, setShiftStats] = useState({
    sales: 0,
    expenses: 0,
    profit: 0,
    shiftId: null
  });
  
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) fetchDashboardData();
  }, [organizationId, pathname]);

  useEffect(() => {
    const handleFocus = () => {
      if (organizationId) fetchDashboardData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [organizationId]);

  const fetchDashboardData = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const currentShift = await shiftService.getCurrentShift(organizationId);
      
      if (!currentShift) {
        setShiftStats({ sales: 0, expenses: 0, profit: 0, shiftId: null });
        setStats(prev => ({ ...prev, pendingPayments: 0 }));
        fetchLifetimeStats();
        setLoading(false);
        return;
      }

      const { data: sales } = await supabase
        .from("sales")
        .select("total_amount, status, created_at")
        .eq("organization_id", organizationId)
        .gte('created_at', currentShift.opened_at);

      const shiftSales = sales?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
      const pending = sales?.filter((s: any) => s.status === 'pending').length || 0;

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('shift_id', currentShift.id);

      // FIX: Added type 'any' to 'e'
      const shiftExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

      setShiftStats({
        sales: shiftSales,
        expenses: shiftExpenses,
        profit: shiftSales - shiftExpenses,
        shiftId: currentShift.id
      });

      setStats(prev => ({ ...prev, pendingPayments: pending }));
      fetchLifetimeStats();

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLifetimeStats = async () => {
     const { data: allSales } = await supabase
        .from("sales")
        .select("total_amount");
     
     // FIX: Added type 'any' to 's'
     const total = allSales?.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0) || 0;
     setStats(prev => ({
        ...prev,
        totalSales: total,
        transactionCount: allSales?.length || 0
     }));
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

      {/* SHIFT PERFORMANCE ROW */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-300">
                {shiftStats.shiftId ? "Current Shift Performance" : "No Active Shift"}
            </h2>
            {shiftStats.shiftId && (
                 <Link href="/reports/stock?action=close_shift" className="text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded font-bold">
                    Close Shift
                </Link>
            )}
        </div>
        
        {shiftStats.shiftId ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <p className="text-sm text-gray-400">Sales</p>
                    <p className="text-2xl font-bold">{formatCurrency(shiftStats.sales)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Expenses</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(shiftStats.expenses)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Net Profit</p>
                    <p className={`text-2xl font-bold ${shiftStats.profit >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {formatCurrency(shiftStats.profit)}
                    </p>
                </div>
            </div>
        ) : (
            <p className="text-gray-400 text-sm">Start a shift to see performance metrics.</p>
        )}
      </div>

      {/* Lifetime Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-40">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue (Lifetime)</p>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(stats.totalSales)}</p>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4">
            <p className="text-xs text-gray-400">{stats.transactionCount} transactions</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-40">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Pending M-Pesa</p>
            <p className="text-2xl font-bold text-yellow-600 tracking-tight">{stats.pendingPayments}</p>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-4">
            <Link href="/reports" className="text-xs text-blue-600 hover:underline">View Report</Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-40">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Quick Actions</p>
          </div>
           <div className="grid grid-cols-2 gap-2 mt-2">
                <Link href="/pos" className="text-center py-2 bg-gray-50 rounded text-xs font-bold hover:bg-gray-100">New Sale</Link>
                <Link href="/expenses" className="text-center py-2 bg-gray-50 rounded text-xs font-bold hover:bg-gray-100">Expense</Link>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <SalesTrendChart />
            
            {/* Top Sellers Widget */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Sellers (Last 30 Days)</h3>
              {topSellers.length === 0 ? (
                <p className="text-sm text-gray-400">No sales data yet.</p>
              ) : (
                <div className="space-y-3">
                  {topSellers.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{index + 1}</span>
                        <span className="font-medium text-gray-800">{item.name}</span>
                      </div>
                      <span className="font-bold text-gray-900">{item.quantity} units</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}