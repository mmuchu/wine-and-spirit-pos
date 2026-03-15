 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatCurrency } from "@/components/pos/utils";

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    totalSales: 0,
    transactionCount: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: sales, error } = await supabase
        .from("sales")
        .select("total_amount, status");

      if (error) throw error;

      const total = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const pending = sales?.filter(s => s.status === 'pending').length || 0;

      setStats({
        totalSales: total,
        transactionCount: sales?.length || 0,
        pendingPayments: pending,
      });
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your business overview.</p>
        </div>
        <Link 
          href="/pos"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          Open POS Terminal
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Transactions</p>
          <p className="text-3xl font-bold">{stats.transactionCount}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-1">Pending M-Pesa</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingPayments}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/pos" className="p-4 bg-muted rounded-lg hover:bg-muted/80 text-center transition">
            <p className="font-medium">New Sale</p>
          </Link>
          <Link href="/reports" className="p-4 bg-muted rounded-lg hover:bg-muted/80 text-center transition">
            <p className="font-medium">View Reports</p>
          </Link>
          <Link href="/inventory" className="p-4 bg-muted rounded-lg hover:bg-muted/80 text-center transition">
            <p className="font-medium">Inventory</p>
          </Link>
          <Link href="/settings" className="p-4 bg-muted rounded-lg hover:bg-muted/80 text-center transition">
            <p className="font-medium">Settings</p>
          </Link>
        </div>
      </div>
    </div>
  );
}