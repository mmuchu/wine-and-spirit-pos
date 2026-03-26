 // src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import Link from "next/link";

interface ProductPerformance {
  name: string;
  quantity: number;
  revenue: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading, isLicenseValid } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [totalSales, setTotalSales] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductPerformance[]>([]);
  const [worstProducts, setWorstProducts] = useState<ProductPerformance[]>([]);

  useEffect(() => {
    // Wait for org to load, and check if it exists
    if (orgLoading) return;
    if (!organizationId) { 
      setLoading(false); 
      return; 
    }
    
    loadDashboardData();
  }, [organizationId, orgLoading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get Active Shift
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle();

      setShift(shifts);

      if (shifts) {
        // 2. Get Sales for this shift
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount, items')
          .eq('shift_id', shifts.id)
          .eq('status', 'completed');

        if (sales) {
          const total = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
          setTotalSales(total);
          setTransactionCount(sales.length);

          const productMap: Record<string, ProductPerformance> = {};
          
          sales.forEach(sale => {
            (sale.items || []).forEach((item: any) => {
              if (!productMap[item.id]) {
                productMap[item.id] = { name: item.name, quantity: 0, revenue: 0 };
              }
              productMap[item.id].quantity += item.quantity || 0;
              productMap[item.id].revenue += (item.price * item.quantity) || 0;
            });
          });

          const productsArray = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
          
          setTopProducts(productsArray.slice(0, 5));
          if (productsArray.length > 5) {
            setWorstProducts(productsArray.slice(-5).reverse());
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Render Logic
  if (orgLoading) return <div className="p-8">Initializing...</div>;
  
  if (!organizationId) return (
    <div className="p-8 text-center space-y-4">
      <h2 className="text-xl font-bold text-red-600">Configuration Error</h2>
      <p className="text-gray-500">Organization context missing. Please contact support.</p>
    </div>
  );

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back!</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${shift ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-2 h-2 rounded-full ${shift ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            Shift {shift ? 'Active' : 'Closed'}
          </div>
          
          {shift && (
            <Link 
              href="/pos" 
              className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 shadow-lg flex items-center gap-2"
            >
              Open POS
            </Link>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-black to-gray-800 rounded-2xl p-6 text-white shadow-xl col-span-1 md:col-span-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase text-gray-300 tracking-wider">Shift Sales</p>
              <h2 className="text-4xl font-extrabold mt-2">{formatCurrency(totalSales)}</h2>
              <p className="text-sm text-gray-400 mt-2">{transactionCount} transactions</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-600 uppercase text-xs tracking-wider">Quick Links</h3>
          
          <div className="space-y-2">
            <Link href="/inventory" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
              </div>
              <span className="font-medium text-gray-700 group-hover:text-black">Inventory</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Sellers */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg text-green-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
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

        {/* Worst Sellers */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
            <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
            </div>
            <h3 className="font-bold text-gray-800">Slow Movers</h3>
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