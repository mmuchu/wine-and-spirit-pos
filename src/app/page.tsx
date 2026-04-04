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
  
  const [cashSales, setCashSales] = useState(0);
  const [mpesaSales, setMpesaSales] = useState(0);

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [worstProducts, setWorstProducts] = useState<any[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

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
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (orgLoading) return;
    if (!organizationId) { setLoading(false); return; }
    loadDashboardData();
  }, [organizationId, orgLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: shifts } = await supabase.from('shifts').select('*').eq('organization_id', organizationId).eq('status', 'open').maybeSingle();
      setShift(shifts);

      if (shifts) {
        const { data: sales } = await supabase.from('sales').select('total_amount, payment_method, items').eq('shift_id', shifts.id).eq('status', 'completed');

        if (sales) {
          const total = sales.reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
          setTotalSales(total);
          setTransactionCount(sales.length);

          const cash = sales.filter((s: any) => s.payment_method === 'cash').reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
          const mpesa = sales.filter((s: any) => s.payment_method === 'mpesa').reduce((sum: number, s: any) => sum + (s.total_amount || 0), 0);
          setCashSales(cash);
          setMpesaSales(mpesa);

          const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
          
          sales.forEach((s: any) => {
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
        
        trendData.forEach((s: any) => {
          const key = new Date(s.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          if (grouped[key] !== undefined) grouped[key] += s.total_amount || 0;
        });
        const chartData = Object.keys(grouped).reverse().map(day => ({ name: day, sales: grouped[day] }));
        setSalesTrend(chartData);
      }

    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const avgTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;

  if (orgLoading || loading) return (
    <div className="p-6 bg-[#fafafa] h-full">
      <div className="grid grid-cols-4 gap-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white border border-gray-100 h-24 rounded-lg" />)}
      </div>
    </div>
  );
  
  if (!organizationId) return <div className="p-6 text-center text-red-600 text-xs font-bold">Configuration Error</div>;

  return (
    <div className="h-full bg-[#fafafa] p-5 overflow-y-auto">
      <div className="space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{getGreeting()} 👋</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(currentTime)}</p>
          </div>
          
          <div className="flex items-center gap-3">
             <p className="text-xs font-mono font-medium text-gray-700">{formatTime(currentTime)}</p>
             
             <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${shift ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
               <span className={`w-1.5 h-1.5 rounded-full ${shift ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
               {shift ? 'Active' : 'Offline'}
             </div>
             
             {shift && (
               <Link href="/pos" className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-md text-[10px] font-bold hover:bg-gray-800 transition-colors">
                 Open POS
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
               </Link>
             )}
          </div>
        </div>

        {/* KPI Grid - Enterprise Style */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-[72px]">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Shift Revenue</span>
            <p className="text-sm font-bold font-mono tabular-nums text-gray-900">{formatCurrency(totalSales)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-[72px]">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Transactions</span>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-bold font-mono tabular-nums text-gray-900">{transactionCount}</p>
              <span className="text-[10px] text-gray-400">avg {formatCurrency(avgTransactionValue)}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-[72px]">
            <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Cash</span>
            <p className="text-sm font-bold font-mono tabular-nums text-blue-600">{formatCurrency(cashSales)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-[72px]">
            <span className="text-[10px] font-medium text-green-600 uppercase tracking-wide">M-Pesa</span>
            <p className="text-sm font-bold font-mono tabular-nums text-green-600">{formatCurrency(mpesaSales)}</p>
          </div>
        </div>

        {/* Chart & Quick Links Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Quick Links</h3>
            <div className="space-y-1">
              {[
                { href: "/inventory", label: "Inventory", color: "bg-blue-50 text-blue-600" },
                { href: "/reports/audit", label: "Audit", color: "bg-green-50 text-green-600" },
                { href: "/reports/profit-loss", label: "P&L", color: "bg-purple-50 text-purple-600" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors group">
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${link.color}`}>→</div>
                  <p className="text-[11px] font-medium text-gray-700">{link.label}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="col-span-3 bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">7-Day Trend</h3>
              <span className="text-[10px] text-gray-400 font-mono">Revenue</span>
            </div>
            <div className="h-36 w-full">
              {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '6px', border: '1px solid #e5e7eb', boxShadow: 'none', fontSize: '11px', padding: '6px 8px' }} 
                      formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center text-gray-300 text-xs">No trend data</div>}
            </div>
          </div>
        </div>

        {/* Bottom Row: Best & Worst Sellers */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white border border-gray-200 rounded-lg p-4">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Top Sellers</h3>
               <span className="text-[9px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-sm">HIGH</span>
             </div>
             <div className="space-y-2">
               {topProducts.length > 0 ? topProducts.map((p, i) => (
                 <div key={i} className="flex items-center gap-2">
                   <span className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                   <span className="text-[11px] text-gray-700 flex-1 truncate">{p.name}</span>
                   <span className="text-[11px] font-mono font-semibold text-gray-900">{p.quantity} <span className="text-gray-400 font-normal">u</span></span>
                 </div>
               )) : <div className="text-center py-6 text-gray-300 text-[11px]">No sales yet</div>}
             </div>
           </div>

           <div className="bg-white border border-gray-200 rounded-lg p-4">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Slow Movers</h3>
               <span className="text-[9px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-sm">LOW</span>
             </div>
             <div className="space-y-2">
               {worstProducts.length > 0 ? worstProducts.map((p, i) => (
                 <div key={i} className="flex items-center gap-2">
                   <span className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold bg-red-50 text-red-500">!</span>
                   <span className="text-[11px] text-gray-700 flex-1 truncate">{p.name}</span>
                   <span className="text-[11px] font-mono font-semibold text-red-500">{p.quantity} <span className="text-gray-400 font-normal">u</span></span>
                 </div>
               )) : <div className="text-center py-6 text-gray-300 text-[11px]">Not enough data</div>}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}