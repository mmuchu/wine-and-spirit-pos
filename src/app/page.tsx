 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";

export default function DashboardPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading } = useOrganization();

  const [stats, setStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    lowStockCount: 0,
  });
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      loadDashboardData();
    }
  }, [organizationId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Check Shift
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);

      // 2. Load Stats
      if (shift) {
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('shift_id', shift.id)
          .eq('status', 'completed');

        const total = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        
        setStats({
          totalSales: total,
          totalTransactions: sales?.length || 0,
          lowStockCount: 0 // Placeholder
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || orgLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back!</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${currentShift ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-xs text-gray-600 font-medium">
            {currentShift ? 'Shift Active' : 'No Active Shift'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/pos" className="block p-6 bg-black text-white rounded-xl hover:bg-gray-800 transition group">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Open POS</h2>
              <p className="text-xs text-gray-300 mt-1">Start selling products</p>
            </div>
            <div className="text-2xl opacity-50 group-hover:opacity-100 transition">→</div>
          </div>
        </Link>

        {!currentShift && (
          <div className="p-6 bg-orange-50 border border-orange-200 rounded-xl text-orange-800">
            <h2 className="text-lg font-bold">Start Shift</h2>
            <p className="text-xs mt-1">You need an active shift to record sales.</p>
            <button 
              onClick={async () => {
                 if (organizationId) {
                   await shiftService.openShift(organizationId, 0);
                   loadDashboardData();
                 }
              }}
              className="mt-3 px-4 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold"
            >
              Start Now (0 Cash)
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-xs text-gray-400 uppercase font-bold">Shift Sales</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalSales)}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-xs text-gray-400 uppercase font-bold">Transactions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTransactions}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <p className="text-xs text-gray-400 uppercase font-bold">Active Shift</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{currentShift ? 'YES' : 'NO'}</p>
        </div>
      </div>

    </div>
  );
}