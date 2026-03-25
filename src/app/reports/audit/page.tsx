 // src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";

type ActivityEvent = {
  id: string;
  time: string;
  type: 'sale' | 'expense' | 'stock' | 'shift_open' | 'shift_close';
  description: string;
  amount?: number;
  meta?: string;
  icon: string;
};

export default function AuditPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (organizationId) loadAuditData();
  }, [organizationId]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      // 1. Get Active Shift
      const currentShift = await shiftService.getCurrentShift(organizationId);
      setShift(currentShift);

      if (!currentShift) {
        setLoading(false);
        return;
      }

      // 2. Fetch All Data in Parallel
      const [salesRes, expensesRes, stockRes] = await Promise.all([
        // Fetch Sales
        supabase
          .from('sales')
          .select('id, created_at, total_amount, payment_method, status, items')
          .eq('shift_id', currentShift.id)
          .order('created_at', { ascending: false }),
        // Fetch Expenses
        supabase
          .from('expenses')
          .select('id, created_at, amount, category, description')
          .eq('shift_id', currentShift.id)
          .order('created_at', { ascending: false }),
        // Fetch Stock Movements
        supabase
          .from('stock_movements')
          .select('id, created_at, quantity, type, total_cost, notes, products(name)')
          .eq('shift_id', currentShift.id)
          .order('created_at', { ascending: false }),
      ]);

      const sales = salesRes.data || [];
      const expenses = expensesRes.data || [];
      const stock = stockRes.data || [];

      // 3. Map to Activity Events
      const events: ActivityEvent[] = [];

      // Shift Open Event
      events.push({
        id: `shift-${currentShift.id}-open`,
        time: currentShift.opened_at,
        type: 'shift_open',
        description: `Shift Started`,
        amount: currentShift.opening_cash,
        meta: `Opening Cash`,
        icon: '🟢'
      });

      // Sales Events
      sales.forEach(s => {
        const itemCount = s.items?.length || 0;
        events.push({
          id: s.id,
          time: s.created_at,
          type: 'sale',
          description: `SALE (${s.payment_method.toUpperCase()}) - ${itemCount} items`,
          amount: s.total_amount,
          meta: s.status,
          icon: '💰'
        });
      });

      // Expense Events
      expenses.forEach(e => {
        events.push({
          id: e.id,
          time: e.created_at,
          type: 'expense',
          description: `EXPENSE - ${e.category || 'General'}`,
          amount: e.amount,
          meta: e.description,
          icon: '💸'
        });
      });

      // Stock Events
      stock.forEach(m => {
        const productName = (m.products as any)?.name || 'Unknown Product';
        events.push({
          id: m.id,
          time: m.created_at,
          type: 'stock',
          description: `STOCK ${m.type.toUpperCase()} - ${productName}`,
          amount: m.total_cost || 0,
          meta: `Qty: ${m.quantity} ${m.notes ? `(${m.notes})` : ''}`,
          icon: m.type === 'purchase' ? '📦' : '📝'
        });
      });

      // 4. Sort by Time (Newest First)
      events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setActivities(events);

    } catch (err) {
      console.error("Audit error", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8">Loading Activity Log...</div>;
  if (!shift) return <div className="p-8 text-center space-y-4">
    <h2 className="text-xl font-bold">No Active Shift</h2>
    <p className="text-gray-500">Start a shift to see the daily audit trail.</p>
  </div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time log of all system activities for this shift.
          </p>
        </div>
        <div className="text-right bg-gray-50 p-3 rounded-lg border">
          <p className="text-xs text-gray-400 uppercase font-bold">Shift Started</p>
          <p className="text-sm font-bold text-gray-800">{new Date(shift.opened_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">

          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No activities recorded yet.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                
                {/* Icon & Line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                    {act.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-bold text-gray-900">{act.description}</p>
                    {act.amount !== undefined && act.amount > 0 && (
                      <p className={`font-mono font-bold text-sm ${
                        act.type === 'expense' ? 'text-red-600' : 
                        act.type === 'sale' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {act.type === 'expense' ? '-' : '+'}{formatCurrency(act.amount)}
                      </p>
                    )}
                  </div>
                  
                  {act.meta && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{act.meta}</p>
                  )}
                  
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                    {formatTime(act.time)}
                  </p>
                </div>

              </div>
            ))
          )}

        </div>
      </div>

    </div>
  );
}