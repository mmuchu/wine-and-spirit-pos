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
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    if (orgLoading) return;
    if (!organizationId) { setLoading(false); return; }
    loadDashboardData();
  }, [organizationId, orgLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: shifts } = await supabase.from('shifts').select('*').eq('organization_id', organizationId).eq('status', 'active').maybeSingle();
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

  // Calculate Average Transaction Value
  const avgTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;

  if (orgLoading || loading) return <div className="p-8 text-gray-400 animate-pulse">Loading Dashboard...</div>;
  if (!organizationId) return <div className="p-8 text-center text-red-600 font-bold">Configuration Error</div>;

  return (
    <div className="min-h-screen bg-gray-50/80">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              {getGreeting()} <span className="text-3xl">👋</span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">{formatDate(currentTime)}</p>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
             <div className="text-right">
               <p className="text-2xl font-bold text-gray-900">{formatTime(currentTime)}</p>
               <p className="text-xs text-gray-400">Local Time</p>
             </div>
             
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${shift ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
               <span className={`w-2 h-2 rounded-full ${shift ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
               {shift ? 'Shift Active' : 'No Shift'}
             </div>
             
             {shift && (
               <Link href="/pos" className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors shadow-sm">
                 <span>Sell</span>
                 <ArrowRightIcon className="w-4 h-4" />
               </Link>
             )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Main Revenue Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
             
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <p className="text-xs font-semibold uppercase text-indigo-200 tracking-wider">Current Shift Revenue</p>
                   <h2 className="text-5xl font-bold mt-2 tracking-tight">{formatCurrency(totalSales)}</h2>
                 </div>
                 <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                   <TrendingUpIcon className="w-5 h-5 text-white" />
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                 <div className="flex items-center gap-3">
                   <div className="bg-white/20 p-2 rounded-lg">
                     <CashIcon className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <p className="text-xs text-indigo-200 font-medium">Cash Sales</p>
                     <p className="text-lg font-bold">{formatCurrency(cashSales)}</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="bg-white/20 p-2 rounded-lg">
                     <CreditCardIcon className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <p className="text-xs text-indigo-200 font-medium">M-Pesa Sales</p>
                     <p className="text-lg font-bold">{formatCurrency(mpesaSales)}</p>
                   </div>
                 </div>
               </div>
             </div>
          </div>

          {/* Secondary Stats */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transactions</h3>
              <ReceiptIcon className="w-4 h-4 text-gray-300" />
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-4xl font-bold text-gray-900">{transactionCount}</p>
                <p className="text-sm text-gray-500 mt-1">Total Sales</p>
              </div>
              
              <div className="h-px bg-gray-100"></div>
              
              <div className="flex justify-between items-baseline">
                <p className="text-sm text-gray-600">Avg. Transaction</p>
                <p className="text-lg font-bold text-gray-800">{formatCurrency(avgTransactionValue)}</p>
              </div>
            </div>
            
            {/* Mobile CTA */}
            {!shift && (
              <Link href="/pos" className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors sm:hidden">
                Open POS
              </Link>
            )}
          </div>
        </div>

        {/* Secondary Row: Quick Actions & Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          
           {/* Quick Actions */}
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 text-sm">Quick Links</h3>
             <div className="space-y-1">
               <Link href="/inventory" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                 <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                   <BoxIcon className="w-5 h-5" />
                 </div>
                 <p className="font-medium text-gray-800 text-sm">Inventory</p>
               </Link>
               <Link href="/reports" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                 <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                   <ReportIcon className="w-5 h-5" />
                 </div>
                 <p className="font-medium text-gray-800 text-sm">Reports</p>
               </Link>
               <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                 <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-gray-600 group-hover:text-white transition-all">
                   <SettingsIcon className="w-5 h-5" />
                 </div>
                 <p className="font-medium text-gray-800 text-sm">Settings</p>
               </Link>
             </div>
           </div>

           {/* Sales Trend Chart */}
           <div className="lg:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Revenue Trend</h3>
               <span className="text-xs text-gray-400 font-medium">Last 7 Days</span>
             </div>
             <div className="h-52 w-full">
               {salesTrend.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={salesTrend}>
                     <defs>
                       <linearGradient id="colorSalesGradient" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                         <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                     <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                     <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Ksh ${v/1000}k`} />
                     <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '8px 12px' }} 
                       formatter={(v: any) => [formatCurrency(v), 'Revenue']}
                       labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}
                     />
                     <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSalesGradient)" />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No sales data yet</div>}
             </div>
           </div>
        </div>

        {/* Bottom Row: Best & Worst Sellers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
           {/* Best Sellers */}
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Top Sellers</h3>
               <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">High Demand</span>
             </div>
             <div className="space-y-3">
               {topProducts.length > 0 ? topProducts.map((p, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                     {i + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-gray-900">{p.quantity}</p>
                     <p className="text-xs text-gray-400">units</p>
                   </div>
                 </div>
               )) : <div className="text-center py-8 text-gray-400 text-sm">No sales yet</div>}
             </div>
           </div>

           {/* Slow Movers */}
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Slow Movers</h3>
               <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Low Demand</span>
             </div>
             <div className="space-y-3">
               {worstProducts.length > 0 ? worstProducts.map((p, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 text-sm font-bold">
                     !
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold text-red-600">{p.quantity}</p>
                     <p className="text-xs text-gray-400">units</p>
                   </div>
                 </div>
               )) : <div className="text-center py-8 text-gray-400 text-sm">Not enough data</div>}
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// --- Icons ---
function ArrowRightIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>); }
function TrendingUpIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" /></svg>); }
function CashIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>); }
function CreditCardIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" /></svg>); }
function ReceiptIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25 6 16.5m3-2.25 3 2.25M9 14.25v4.5m0-4.5h6m-6 4.5h6m3-13.5v16.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75Zm-3 0v16.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V4.5A.75.75 0 0 1 6.75 3h1.5a.75.75 0 0 1 .75.75Z" /></svg>); }
function BoxIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>); }
function ReportIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>); }
function SettingsIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>); }