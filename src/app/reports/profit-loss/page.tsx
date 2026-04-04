 // src/app/reports/profit-loss/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

type ExpenseItem = { id: string; description: string | null; category: string | null; amount: number; cost_type: 'fixed' | 'variable' | null; };
type ReportData = { revenue: number; cogs: number; grossProfit: number; fixedCosts: number; variableCosts: number; totalExpenses: number; netProfit: number; rawExpenses: ExpenseItem[]; rawOrders: any[]; };

export default function ProfitLossPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData>({ revenue: 0, cogs: 0, grossProfit: 0, fixedCosts: 0, variableCosts: 0, totalExpenses: 0, netProfit: 0, rawExpenses: [], rawOrders: [] });
  const [activeBreakdown, setActiveBreakdown] = useState<'revenue' | 'cogs' | 'expenses' | null>(null);

  useEffect(() => { if (organizationId) fetchReport(); }, [organizationId, viewMode, date, month]);

  const fetchReport = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const targetDate = viewMode === 'daily' 
        ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi' })
        : null;

      // 1. Fetch Orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, created_at, total, status")
        .eq("organization_id", organizationId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (ordersError) console.error(ordersError);

      // Filter locally for timezone
      const filteredOrders = (orders || []).filter(order => {
        if (viewMode === 'daily') {
          return new Date(order.created_at).toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi' }) === targetDate;
        }
        return order.created_at.startsWith(month);
      });

      const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      // 2. Fetch Product Costs for COGS Calculation
      const { data: products } = await supabase
        .from("products")
        .select("id, cost_price");
      
      const productCosts: Record<string, number> = {};
      if (products) {
        products.forEach(p => {
          productCosts[p.id] = Number(p.cost_price) || 0;
        });
      }

      // 3. Fetch Order Items to get quantities sold
      const orderIds = filteredOrders.map(o => o.id);
      let totalCogs = 0;
      
      if (orderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("order_id, product_id, quantity")
          .in("order_id", orderIds);

        if (orderItems) {
          orderItems.forEach(item => {
            const costPerUnit = productCosts[item.product_id] || 0;
            totalCogs += costPerUnit * (item.quantity || 0);
          });
        }
      }

      // 4. Fetch Expenses
      let expStart, expEnd;
      if (viewMode === 'daily') { expStart = date; expEnd = date; } 
      else { const y = parseInt(month.split('-')[0]); const m = parseInt(month.split('-')[1]); const lastDay = new Date(y, m, 0).getDate(); expStart = `${y}-${String(m).padStart(2,'0')}-01`; expEnd = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`; }

      const { data: expensesData } = await supabase
        .from('expenses').select('id, description, category, amount, cost_type, date')
        .eq("organization_id", organizationId).gte('date', expStart).lte('date', expEnd);

      const rawExpenses: ExpenseItem[] = (expensesData || []).map(exp => ({ id: exp.id, description: exp.description, category: exp.category || 'General', amount: exp.amount || 0, cost_type: exp.cost_type || 'variable' }));
      const fixedCosts = rawExpenses.filter(e => e.cost_type === 'fixed').reduce((sum, e) => sum + e.amount, 0);
      const variableCosts = rawExpenses.filter(e => e.cost_type === 'variable').reduce((sum, e) => sum + e.amount, 0);
      const totalExpenses = fixedCosts + variableCosts;

      setReport({ 
        revenue: totalRevenue, cogs: totalCogs, grossProfit: totalRevenue - totalCogs, 
        fixedCosts, variableCosts, totalExpenses, 
        netProfit: (totalRevenue - totalCogs) - totalExpenses, 
        rawExpenses, rawOrders: filteredOrders 
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const renderBreakdownContent = () => {
    if (!activeBreakdown) return null;
    let title = "", content = null;
    if (activeBreakdown === 'revenue') {
      title = "Revenue Breakdown (Orders)";
      content = (<table className="w-full text-xs"><thead className="bg-gray-50 text-[10px] uppercase text-gray-500"><tr><th className="p-2 text-left">Time</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-gray-50">{report.rawOrders.length===0?<tr><td colSpan={3} className="p-4 text-center text-gray-400">No orders</td></tr>:report.rawOrders.map((o)=>(<tr key={o.id}><td className="p-2 font-mono">{new Date(o.created_at).toLocaleTimeString()}</td><td className="p-2"><span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">{o.status}</span></td><td className="p-2 text-right font-bold text-green-700 font-mono">+ {formatCurrency(o.total)}</td></tr>))}</tbody></table>);
    } else if (activeBreakdown === 'cogs') {
      title = "Cost of Goods Sold (COGS)";
      content = (<div className="text-center"><p className="text-sm font-bold text-blue-600 mb-2">Total COGS: {formatCurrency(report.cogs)}</p><p className="text-[10px] text-gray-400 mb-4">Calculated using product cost prices from inventory</p></div>);
    } else if (activeBreakdown === 'expenses') {
      title = "Expenses Breakdown";
      content = (<table className="w-full text-xs"><thead className="bg-gray-50 text-[10px] uppercase text-gray-500"><tr><th className="p-2 text-left">Description</th><th className="p-2 text-right">Amount</th></tr></thead><tbody className="divide-y divide-gray-50">{report.rawExpenses.length===0?<tr><td colSpan={2} className="p-4 text-center text-gray-400">None</td></tr>:report.rawExpenses.map((e)=>(<tr key={e.id}><td className="p-2">{e.description||e.category}</td><td className="p-2 text-right font-bold text-red-600 font-mono">- {formatCurrency(e.amount)}</td></tr>))}</tbody></table>);
    }
    return (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setActiveBreakdown(null)}><div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}><div className="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0"><h2 className="text-xs font-bold">{title}</h2><button onClick={() => setActiveBreakdown(null)} className="text-gray-400 hover:text-black text-lg font-bold">&times;</button></div><div className="p-4 overflow-auto flex-1">{content}</div></div></div>);
  };

  if (loading) return <div className="p-8 text-xs text-gray-500">Generating Report...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8 space-y-6">
      {renderBreakdownContent()}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10 py-2 bg-gray-50/80 backdrop-blur-sm">
        <div><h1 className="text-lg font-bold text-gray-900">Profit & Loss Statement</h1><p className="text-gray-500 text-xs mt-1">{viewMode === 'daily' ? `Report for ${new Date(date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : `Monthly Report for ${new Date(month + '-01T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`}</p></div>
        <div className="flex gap-2 items-center">
          <div className="bg-white p-1 rounded-lg shadow-sm border text-xs">
            <button onClick={() => setViewMode('daily')} className={`px-3 py-1.5 rounded font-bold transition ${viewMode === 'daily' ? 'bg-black text-white' : 'text-gray-600'}`}>Daily</button>
            <button onClick={() => setViewMode('monthly')} className={`px-3 py-1.5 rounded font-bold transition ${viewMode === 'monthly' ? 'bg-black text-white' : 'text-gray-600'}`}>Monthly</button>
          </div>
          <input type={viewMode === 'monthly' ? 'month' : 'date'} value={viewMode === 'monthly' ? month : date} onChange={(e) => viewMode === 'monthly' ? setMonth(e.target.value) : setDate(e.target.value)} className="bg-white border border-gray-200 text-xs font-medium px-2 py-1.5 rounded-lg outline-none" />
        </div>
      </div>

      <div className={`rounded-xl p-5 shadow-lg border ${report.netProfit >= 0 ? 'bg-gradient-to-r from-green-600 to-emerald-500 border-green-400' : 'bg-gradient-to-r from-red-600 to-rose-500 border-red-400'}`}>
        <div className="text-white"><p className="text-xs font-medium opacity-90">Net Profit</p><h2 className="text-3xl font-extrabold mt-1 font-mono">{formatCurrency(report.netProfit)}</h2></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div onClick={() => setActiveBreakdown('revenue')} className="bg-white p-4 rounded-lg border shadow-sm cursor-pointer hover:border-green-400 transition-colors"><p className="text-[10px] text-gray-500">Total Revenue</p><p className="text-sm font-bold font-mono mt-1">{formatCurrency(report.revenue)}</p></div>
        <div onClick={() => setActiveBreakdown('cogs')} className="bg-white p-4 rounded-lg border shadow-sm cursor-pointer hover:border-blue-400 transition-colors"><p className="text-[10px] text-gray-500">Cost of Goods Sold</p><p className="text-sm font-bold font-mono mt-1">{formatCurrency(report.cogs)}</p></div>
        <div onClick={() => setActiveBreakdown('expenses')} className="bg-white p-4 rounded-lg border shadow-sm cursor-pointer hover:border-orange-400 transition-colors"><p className="text-[10px] text-gray-500">Operating Expenses</p><p className="text-sm font-bold font-mono mt-1">{formatCurrency(report.totalExpenses)}</p></div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50"><h3 className="text-xs font-bold text-gray-700">Detailed Breakdown</h3></div>
        <div className="p-5 space-y-6 text-xs">
          <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100"><span className="font-semibold text-green-800">Gross Revenue</span><span className="font-bold text-green-700 text-sm font-mono">{formatCurrency(report.revenue)}</span></div>
          
          <div className="space-y-2 border-l-4 border-blue-500 pl-4 py-1">
            <div className="flex justify-between text-gray-700"><span>Less: Cost of Goods Sold</span><span className="font-medium text-blue-600 font-mono">- {formatCurrency(report.cogs)}</span></div>
            <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold text-gray-900 text-sm">Gross Profit</span><span className="font-bold text-gray-900 text-sm font-mono">{formatCurrency(report.grossProfit)}</span></div>
          </div>
          
          <div className="space-y-2 border-l-4 border-orange-500 pl-4 py-1">
            <div className="flex justify-between text-gray-700 mb-1"><span className="font-medium">Expenses</span><span className="font-mono">- {formatCurrency(report.totalExpenses)}</span></div>
            <div className="pl-4 space-y-1 text-gray-500">{report.rawExpenses.length===0?<p className="italic text-gray-400">None</p>:report.rawExpenses.map((e)=>(<div key={e.id} className="flex justify-between text-gray-600"><span className="truncate pr-4">{e.description||e.category}</span><span className="font-mono">- {formatCurrency(e.amount)}</span></div>))}</div>
            <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold text-gray-900 text-sm">Total Expenses</span><span className="font-bold text-orange-600 text-sm font-mono">- {formatCurrency(report.totalExpenses)}</span></div>
          </div>
          
          <div className={`mt-4 p-4 rounded-xl flex justify-between items-center ${report.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}><span className="text-white font-bold text-sm">NET PROFIT</span><span className="text-white font-extrabold text-xl font-mono">{formatCurrency(report.netProfit)}</span></div>
        </div>
      </div>
    </div>
  );
}