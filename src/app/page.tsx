 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import Link from "next/link";

interface ProductPerformance {
  name: string;
  quantity: number;
  revenue: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [totalSales, setTotalSales] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [worstProducts, setWorstProducts] = useState<ProductPerformance[]>([]);

  useEffect(() => {
    if (organizationId) loadDashboardData();
  }, [organizationId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get Active Shift
      const currentShift = await shiftService.getCurrentShift(organizationId);
      setShift(currentShift);

      if (currentShift) {
        // 2. Fetch Sales for this shift
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, items')
          .eq('shift_id', currentShift.id)
          .eq('status', 'completed');

        if (sales) {
          // Totals
          const total = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
          setTotalSales(total);
          setTransactionCount(sales.length);

          // Product Performance Aggregation
          const productMap: Record<string, { name: string; qty: number; rev: number }> = {};
          
          sales.forEach(sale => {
            (sale.items || []).forEach((item: any) => {
              if (!productMap[item.id]) {
                productMap[item.id] = { name: item.name, qty: 0, rev: 0 };
              }
              productMap[item.id].qty += item.quantity || 0;
              productMap[item.id].rev += (item.price * item.quantity) || 0;
            });
          });

          // Convert to array and sort
          const productsArray = Object.values(productMap).sort((a, b) => b.qty - a.qty);
          
          setTopProducts(productsArray.slice(0, 5)); // Top 5
          
          // Worst 5 (among items actually sold)
          // If we want items with 0 sales, we'd need to query all products vs sales.
          // For now, we show lowest sellers among those sold.
          if (productsArray.length > 5) {
            setWorstProducts(productsArray.slice(-5).reverse());
          } else {
            setWorstProducts([]); // Not enough data to show worst
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here is your shift summary.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${shift ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${shift ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            Shift {shift ? 'Active' : 'Closed'}
          </div>
          
          {shift && (
            <Link 
              href="/pos" 
              className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              Open POS
            </Link>
          )}
        </div>
      </div>

      {/* MAIN STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-black to-gray-800 rounded-2xl p-6 text-white shadow-xl col-span-1 md:col-span-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase text-gray-300 tracking-wider">Shift Sales</p>
              <h2 className="text-4xl font-extrabold mt-2">{formatCurrency(totalSales)}</h2>
              <p className="text-sm text-gray-400 mt-2">{transactionCount} transactions</p>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 opacity-80">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
               </svg>
            </div>
          </div>
        </div>

        {/* Quick Info Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-600 uppercase text-xs tracking-wider">Quick Links</h3>
          
          <div className="space-y-2">
            <Link href="/inventory" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 group-hover:text-black">Inventory</span>
            </Link>

            <Link href="/reports/audit" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.042-.114 2.25 2.25 0 0 0-2.26-2.243 48.41 48.41 0 0 0-2.26.114c-1.131.094-1.976 1.057-1.976 2.192v.96m0 0v.96m0 0H8.25m0 0v.96m0 0v.96m0 0H6.75m0 0v-.96m0 0v-.96m0 0V6.75m0 0v-.96m0 0V5.25m0 0v-.96m0 0V3.75m0 0A2.25 2.25 0 0 1 7.5 1.5h9a2.25 2.25 0 0 1 2.25 2.25v.96m-4.5 0v-.96m0 0v.96m0 0v.96m0 0H12m0 0v-.96m0 0v.96m0 0v.96m0 0h-.75m0 0v-.96m0 0v-.96m0 0H9m0 0v.96m0 0v.96m0 0h-.75m0 0v-.96m0 0v-.96m0 0H6m0 0v.96m0 0v.96m0 0H5.25m0 0v-.96m0 0v-.96m0 0V6.75" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 group-hover:text-black">Daily Audit</span>
            </Link>
          </div>
        </div>

      </div>

      {/* PRODUCT PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TOP SELLERS */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg text-green-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
               </svg>
            </div>
            <h3 className="font-bold text-gray-800">Best Moving Products</h3>
          </div>
          <div className="p-4">
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">No sales data yet.</p>
            ) : (
              <ul className="space-y-3">
                {topProducts.map((p, i) => (
                  <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-green-600 bg-green-100 rounded-full">{i + 1}</span>
                      <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{p.quantity} sold</p>
                      <p className="text-xs text-gray-500">{formatCurrency(p.revenue)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* WORST SELLERS */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
               </svg>
            </div>
            <h3 className="font-bold text-gray-800">Slow Movers (Lowest Sales)</h3>
          </div>
          <div className="p-4">
            {worstProducts.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">Not enough data.</p>
            ) : (
              <ul className="space-y-3">
                {worstProducts.map((p, i) => (
                  <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center text-xs font-bold text-red-600 bg-red-100 rounded-full">{i + 1}</span>
                      <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">{p.quantity} sold</p>
                      <p className="text-xs text-gray-500">{formatCurrency(p.revenue)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}