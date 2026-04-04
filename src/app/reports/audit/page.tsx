 // src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

interface TimelineEvent {
  id: string; time: string; type: "ORDER" | "EXPENSE"; method?: string;
  amount?: number; details: string; created_at: string;
}
interface AuditData { total_sales: number; cash_sales: number; mpesa_sales: number; total_expenses: number; timeline: TimelineEvent[]; }

export default function DailyAuditPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'TOTAL' | 'EXPENSES' | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    fetchAuditData();
  }, [organizationId, date]);

  const fetchAuditData = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const targetDate = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi' });
      
      // Fetch from "orders" table (The correct table!)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, created_at, total, status, payment_method")
        .eq("organization_id", organizationId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (ordersError) console.error(ordersError);

      // Filter locally for Nairobi timezone
      const filteredOrders = (ordersData || []).filter(order => 
        new Date(order.created_at).toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi' }) === targetDate
      );

      const orders = filteredOrders.map(order => ({
        id: order.id,
        time: new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        type: "ORDER" as const,
        method: order.payment_method?.toUpperCase() || "ORDER",
        amount: order.total,
        details: `Order (${order.status || 'completed'})`,
        created_at: order.created_at
      }));

      // Fetch Expenses
      const { data: expensesData } = await supabase
        .from("expenses").select("id, created_at, amount, category, description") 
        .eq("organization_id", organizationId).eq('date', date);

      const expenses = (expensesData || []).map(exp => ({
        id: exp.id, time: "N/A", type: "EXPENSE" as const, amount: exp.amount,
        details: exp.description || exp.category || "Recorded Expense", created_at: exp.created_at || ""
      }));

      const timeline = [...orders, ...expenses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Note: Cash/M-Pesa split might be 0 if payment_method isn't saved in orders table
      const totalSales = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
      const cashSales = orders.filter(o => o.method === 'CASH').reduce((sum, o) => sum + (o.amount || 0), 0);
      const mpesaSales = orders.filter(o => o.method === 'MPESA').reduce((sum, o) => sum + (o.amount || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      setData({ total_sales: totalSales, cash_sales: cashSales, mpesa_sales: mpesaSales, total_expenses: totalExpenses, timeline });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getFilteredData = () => {
    if (!data) return [];
    return data.timeline.filter(t => 
      (activeModal === 'EXPENSES' && t.type === 'EXPENSE') ||
      (activeModal === 'TOTAL' && t.type === 'ORDER') ||
      (!activeModal && t.type === 'ORDER')
    );
  };

  return (
    <div className="flex-1 bg-[#fafafa] p-5 overflow-y-auto text-gray-800">
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-sm font-semibold text-gray-900">Daily Audit Log</h1><p className="text-[10px] text-gray-500 mt-0.5">Financial reconciliation & activity</p></div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white border border-gray-200 text-[11px] font-medium text-gray-700 px-2.5 py-1.5 rounded-md outline-none focus:ring-1 focus:ring-black/10" />
      </div>

      {loading ? <div className="grid grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-white border border-gray-100 rounded-lg h-20 animate-pulse" />)}</div> : data && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <MetricCard label="Total Revenue" value={data.total_sales} sub="Gross for the day" onClick={() => setActiveModal('TOTAL')} />
            <MetricCard label="Expenses" value={data.total_expenses} sub="Outflows" accent="text-red-600" onClick={() => setActiveModal('EXPENSES')} />
            <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-[76px]">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Net</span>
              <p className={`text-sm font-bold font-mono tabular-nums ${data.total_sales - data.total_expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data.total_sales - data.total_expenses)}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold text-gray-700">Activity Ledger</h2>
              <span className="text-[10px] text-gray-400 font-mono">{data.timeline.length} entries</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[calc(100vh-320px)] overflow-y-auto">
              {data.timeline.length === 0 ? <div className="text-center py-10 text-[11px] text-gray-400">No activity recorded for this date.</div> : data.timeline.map((event) => (
                <div key={event.id} className="flex items-baseline gap-3 px-4 py-2.5 hover:bg-gray-50/50">
                  <span className="text-[10px] font-mono text-gray-400 w-16 shrink-0">{event.time}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm w-14 text-center shrink-0 ${event.type === "EXPENSE" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>{event.type === "EXPENSE" ? "EXP" : event.method}</span>
                  <span className="text-[11px] text-gray-600 flex-1 truncate">{event.details}</span>
                  <span className={`text-[11px] font-mono font-semibold shrink-0 ${event.type === "EXPENSE" ? "text-red-600" : "text-gray-900"}`}>{event.type === "EXPENSE" ? "-" : "+"}{formatCurrency(event.amount || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-semibold text-gray-900">{activeModal === 'TOTAL' ? 'Revenue Breakdown' : 'Expenses Breakdown'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {getFilteredData().length === 0 ? <div className="text-center py-8 text-[11px] text-gray-400">No transactions found.</div> : getFilteredData().map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-[11px] text-gray-700 truncate pr-4">{item.details}</span>
                  <span className={`text-[11px] font-mono font-semibold shrink-0 ${item.type === 'EXPENSE' ? 'text-red-600' : 'text-green-700'}`}>{item.amount ? formatCurrency(item.amount) : '-'}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-gray-500">Sum: {getFilteredData().length}</span>
              <span className="text-xs font-bold font-mono text-gray-900">{formatCurrency(getFilteredData().reduce((s, i) => s + (i.amount || 0), 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MetricCard = ({ label, value, sub, accent = "text-gray-900", onClick }: { label: string; value: number; sub: string; accent?: string; onClick: () => void }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col justify-between h-[76px] cursor-pointer hover:bg-gray-50 transition-colors group" onClick={onClick}>
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
    </div>
    <div><p className={`text-sm font-bold font-mono tabular-nums ${accent}`}>{formatCurrency(value)}</p><p className="text-[10px] text-gray-400 mt-0.5">{sub}</p></div>
  </div>
);