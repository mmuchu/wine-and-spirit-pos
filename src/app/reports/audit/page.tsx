 // src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

export default function DailyAuditPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
  
  // Summary State
  const [summary, setSummary] = useState({ sales: 0, expenses: 0, cash: 0, mpesa: 0 });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) fetchAuditData();
  }, [organizationId, date]);

  const fetchAuditData = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      // Define Date Range
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      // 1. Fetch Sales
      const { data: sales } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, payment_method, status')
        .eq('organization_id', organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // 2. Fetch Expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, created_at, amount, category, notes')
        .eq('organization_id', organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // 3. Fetch Shifts
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`opened_at.gte.${start.toISOString()},closed_at.gte.${start.toISOString()}`);

      // Calculate Summary
      const salesTotal = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const expensesTotal = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const cashTotal = sales?.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const mpesaTotal = sales?.filter(s => s.payment_method === 'mpesa').reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      setSummary({
        sales: salesTotal,
        expenses: expensesTotal,
        cash: cashTotal,
        mpesa: mpesaTotal
      });

      // Build Timeline
      const timeline: any[] = [];

      sales?.forEach(s => {
        timeline.push({
          time: new Date(s.created_at),
          type: 'sale',
          icon: '💵',
          title: `Sale (${s.payment_method?.toUpperCase()})`,
          description: `Total: ${formatCurrency(s.total_amount)}`,
          amount: s.total_amount
        });
      });

      expenses?.forEach(e => {
        timeline.push({
          time: new Date(e.created_at),
          type: 'expense',
          icon: '📉',
          title: `Expense: ${e.category || 'General'}`,
          description: e.notes || 'No note',
          amount: -e.amount
        });
      });

      shiftsData?.forEach(sh => {
        if (new Date(sh.opened_at) >= start) {
          timeline.push({
            time: new Date(sh.opened_at),
            type: 'shift_open',
            icon: '🟢',
            title: 'Shift Opened',
            description: `Opening Cash: ${formatCurrency(sh.opening_cash || 0)}`,
            amount: 0
          });
        }
        if (sh.closed_at && new Date(sh.closed_at) >= start) {
          timeline.push({
            time: new Date(sh.closed_at),
            type: 'shift_close',
            icon: '🔴',
            title: 'Shift Closed',
            description: `Closing Cash: ${formatCurrency(sh.closing_cash || 0)}`,
            amount: 0
          });
        }
      });

      // Sort Timeline
      timeline.sort((a, b) => b.time.getTime() - a.time.getTime());
      
      setActivities(timeline);
      setShifts(shiftsData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getVarianceSummary = (shift: any) => {
    if (!shift.closing_stock || !shift.opening_stock) return { count: 0, hasVariance: false };
    let varianceCount = 0;
    Object.keys(shift.closing_stock).forEach(key => {
      const opening = shift.opening_stock[key] || 0;
      const closing = shift.closing_stock[key];
      if (opening !== closing) varianceCount++;
    });
    return { count: varianceCount, hasVariance: varianceCount > 0 };
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8">Loading Audit...</div>;

  // --- Detail View ---
  if (selectedShift) {
    return (
      <div className="p-6 space-y-6">
        <button onClick={() => setSelectedShift(null)} className="text-sm text-gray-500 hover:text-black flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to List
        </button>

        <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Shift Audit Report</h2>
              <p className="text-gray-500 text-sm">Opened: {new Date(selectedShift.opened_at).toLocaleString()}</p>
              <p className="text-gray-500 text-sm">Closed: {selectedShift.closed_at ? new Date(selectedShift.closed_at).toLocaleString() : 'Active'}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedShift.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {selectedShift.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 font-bold uppercase">Opening Cash</p>
              <p className="text-lg font-bold">{formatCurrency(selectedShift.opening_cash || 0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 font-bold uppercase">Closing Cash</p>
              <p className="text-lg font-bold">{formatCurrency(selectedShift.closing_cash || 0)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-400 font-bold uppercase">User ID</p>
              <p className="text-lg font-bold font-mono truncate">{selectedShift.user_id?.substring(0,8)}...</p>
            </div>
          </div>
        </div>

        {/* Stock Variance Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-bold">Stock Variance</h3>
          </div>
          
          {selectedShift.closing_stock ? (
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="p-3 text-left font-semibold">Product ID</th>
                     <th className="p-3 text-center font-semibold">Opening</th>
                     <th className="p-3 text-center font-semibold">Closing</th>
                     <th className="p-3 text-center font-semibold">Variance</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y">
                   {Object.entries(selectedShift.closing_stock).map(([id, closing]: [string, any]) => {
                      const opening = selectedShift.opening_stock?.[id] || 0;
                      const variance = opening - closing;
                      return (
                        <tr key={id} className={variance !== 0 ? 'bg-red-50' : ''}>
                          <td className="p-3 font-mono text-gray-500 text-xs">{id.substring(0, 8)}...</td>
                          <td className="p-3 text-center">{opening}</td>
                          <td className="p-3 text-center font-bold">{closing}</td>
                          <td className={`p-3 text-center font-bold ${variance !== 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {variance > 0 ? `+${variance}` : variance}
                          </td>
                        </tr>
                      );
                   })}
                 </tbody>
               </table>
             </div>
          ) : (
            <div className="p-8 text-center text-gray-400">No stock data recorded.</div>
          )}
        </div>
      </div>
    );
  }

  // --- List View ---
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Audit</h1>
          <p className="text-gray-500 text-sm mt-1">Record of all activities for {date}.</p>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="border p-2 rounded-lg shadow-sm"
        />
      </div>

      {/* Summary Cards - Small Fonts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">Total Sales</p>
          <p className="text-lg font-extrabold text-gray-900 mt-1">{formatCurrency(summary.sales)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">Cash</p>
          <p className="text-lg font-extrabold text-green-600 mt-1">{formatCurrency(summary.cash)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">M-Pesa</p>
          <p className="text-lg font-extrabold text-blue-600 mt-1">{formatCurrency(summary.mpesa)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <p className="text-xs text-gray-400 font-bold uppercase">Expenses</p>
          <p className="text-lg font-extrabold text-red-600 mt-1">{formatCurrency(summary.expenses)}</p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b">
           <h3 className="font-bold text-gray-800">Activity Timeline</h3>
        </div>
        
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No activity recorded.</div>
          ) : (
            activities.map((item, index) => (
              <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                <div className="text-2xl">{item.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-gray-800">{item.title}</p>
                    <span className={`font-bold text-sm ${item.amount < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.amount !== 0 ? formatCurrency(item.amount) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatTime(item.time)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}