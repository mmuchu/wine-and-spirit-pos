 // src/components/dashboard/SalesTrendChart.tsx
"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

export function SalesTrendChart() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      fetchChartData();
    }
  }, [organizationId]);

  const fetchChartData = async () => {
    if (!organizationId) return;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .eq('organization_id', organizationId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Aggregate by date
      const dailyTotals: Record<string, number> = {};
      
      data?.forEach((sale: any) => {
        const date = new Date(sale.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        dailyTotals[date] = (dailyTotals[date] || 0) + (sale.total_amount || 0);
      });

      // Format for Recharts
      const formattedData = Object.entries(dailyTotals).map(([date, total]) => ({
        date,
        total
      }));

      setChartData(formattedData);
    } catch (err) {
      console.error("Failed to load chart data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">Loading chart...</div>
      ) : chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400">No sales data available.</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000000" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              tickLine={false} 
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              tickLine={false} 
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `Ksh ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              // FIX: Cast value to number to satisfy TypeScript strict mode
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Area type="monotone" dataKey="total" stroke="#000000" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}