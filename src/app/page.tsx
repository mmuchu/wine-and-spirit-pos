 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [totalSales, setTotalSales] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  
  // Payment Breakdown
  const [cashSales, setCashSales] = useState(0);
  const [mpesaSales, setMpesaSales] = useState(0);

  // Analytics
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [worstProducts, setWorstProducts] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (orgLoading) return;
    if (!organizationId) { setLoading(false); return; }
    loadDashboardData();
  }, [organizationId, orgLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Active Shift
      const { data: shifts } = await supabase.from('shifts').select('*').eq('organization_id', organizationId).eq('status', 'active').maybeSingle();
      setShift(shifts);

      if (shifts) {
        const { data: sales } = await supabase.from('sales').select('total_amount, payment_method, items').eq('shift_id', shifts.id).eq('status', 'completed');

        if (sales) {
          const total = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
          setTotalSales(total);
          setTransactionCount(sales.length);

          const cash = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + (s.total_amount || 0), 0);
          const mpesa = sales.filter(s => s.payment_method === 'mpesa').reduce((sum, s) => sum + (s.total_amount || 0), 0);
          setCashSales(cash);
          setMpesaSales(mpesa);

          // Calculate Top/Bottom Products
          const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
          sales.forEach(s => {
            (s.items || []).forEach((item: any) => {
              if (!productMap[item.id]) productMap[item.id] = { name: item.name, quantity: 0, revenue: 0 };
              productMap[item.id].quantity += item.quantity || 0;
              productMap[item.id].revenue += (item.price * item.quantity) || 0;
            });
          });

          const sortedProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
          setTopProducts(sortedProducts.slice(0, 5));
          if (sortedProducts.length > 5) setWorstProducts(sortedProducts.slice(-5).reverse());
        }
      }

      // 2. Sales Trend (Last 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: trendData } = await supabase.from('sales').select('created_at, total_amount').eq('organization_id', organizationId).eq('status', 'completed').gte('created_at', sevenDaysAgo.toISOString());

      if (trendData) {
        const grouped: Record<string, number> = {};
        for(let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('en-US', { weekday: 'short' });
          grouped[key] = 0;
        }
        trendData.forEach(s => {
          const key = new Date(s.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          if (grouped[key] !== undefined) grouped[key] += s.total_amount || 0;
        });
        const chartData = Object.keys(grouped).reverse().map(day => ({ name: day, sales: grouped[day] }));
        setSalesTrend(chartData);
      }

    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  if (orgLoading || loading) return <div className="p-8 text-gray-400 animate-pulse">Loading Dashboard...</div>;
  if (!organizationId) return <div className="p-8 text-center text-red-600 font-bold">Configuration Error</div>;

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getGreeting()}</h1>
          <p className="text-gray-500 text-sm mt-1">{formatDate(currentTime)}</p>
        </div>
        <div className="flex items-center gap-4">
           <p className="text-2xl font-bold text-gray-900">{formatTime(currentTime)}</p>
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${shift ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
             <span className={`w-2 h-2 rounded-full ${shift ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
             {shift ? 'Active Shift' : 'No Shift'}
           </div>
           {shift && <Link href="/pos" className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold">Open POS</Link>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold uppercase text-white/70">Shift Revenue</p>
                <h2 className="text-4xl font-extrabold mt-1">{formatCurrency(totalSales)}</h2>
                <p className="text-sm text-white/50 mt-1">{transactionCount} transactions</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                 <ChartIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-white/60 uppercase font-medium">Cash Sales</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(cashSales)}</p>
              </div>
              <div>
                <p className="text-xs text-white/60 uppercase font-medium">M-Pesa Sales</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(mpesaSales)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
          <h3 className="font-bold text-gray-800">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/inventory" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BoxIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Inventory</p>
                <p className="text-xs text-gray-400">Manage Stock</p>
              </div>
            </Link>
            <Link href="/reports" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ReportIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-800 text-sm">Reports</p>
                <p className="text-xs text-gray-400">View Analytics</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart - Area Chart with Gradient */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border">
          <h3 className="font-bold text-gray-800 mb-4">Sales Trend (Last 7 Days)</h3>
          <div className="h-64 w-full">
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} 
                    formatter={(v: any) => formatCurrency(v)}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-300 text-sm">No data</div>}
          </div>
        </div>

        {/* Fast & Slow Movers */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Best Sellers</h3>
            <div className="space-y-3">
              {topProducts.length > 0 ? topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 w-4">{i+1}</span>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{p.name}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{p.quantity}</p>
                </div>
              )) : <p className="text-xs text-gray-400 text-center">No sales</p>}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><span className="w-3 h-3 bg-red-400 rounded-full"></span> Slow Movers</h3>
            <div className="space-y-3">
              {worstProducts.length > 0 ? worstProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300 w-4">{i+1}</span>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[100px]">{p.name}</p>
                  </div>
                  <p className="text-sm font-bold text-red-600">{p.quantity}</p>
                </div>
              )) : <p className="text-xs text-gray-400 text-center">Not enough data</p>}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Icons
function ChartIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>); }
function BoxIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>); }
function ReportIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>); }