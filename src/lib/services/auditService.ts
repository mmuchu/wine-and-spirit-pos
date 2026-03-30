import { createClient } from "@/lib/supabase/client";

export const auditService = {
  async log(action: string, details: string, organizationId?: string | null, meta: object = {}) {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: organizationId, 
        action,
        details,
        meta
      });
      
      if (error) {
        console.error("Audit Log Error:", error.message);
      }
    } catch (e) {
      console.error("Audit System Error:", e);
    }
  },

  async getActivities(organizationId: string, limit: number = 50) {
    const supabase = createClient();
    const activities: any[] = [];

    try {
      // 1. Fetch Sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, payment_method')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!salesError && sales) {
        sales.forEach((s: any) => activities.push({
          type: 'SALE', icon: '💰', color: 'green', date: s.created_at,
          title: `Sale: ${s.payment_method?.toUpperCase() || 'UNKNOWN'}`,
          description: `Total: Ksh ${s.total_amount}`, user: 'Staff', id: s.id
        }));
      }

      // 2. Fetch Stock Movements (Replaces the old purchases table)
      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select('*, products(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!movError && movements) {
        movements.forEach((m: any) => {
          const isPurchase = m.type === 'purchase';
          activities.push({
            type: 'STOCK', icon: isPurchase ? '📦' : '⚙️', color: isPurchase ? 'blue' : 'orange', date: m.created_at,
            title: `${m.type?.toUpperCase()}: ${m.products?.name || 'Product'}`,
            description: `Qty: ${m.quantity > 0 ? '+' : ''}${m.quantity}`, user: 'Staff', id: m.id
          });
        });
      }

      // 3. Fetch Shifts
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('opened_at', { ascending: false })
        .limit(limit);

      if (!shiftError && shifts) {
        shifts.forEach((s: any) => {
          activities.push({
            type: 'SHIFT', icon: '⏰', color: 'purple', date: s.opened_at,
            title: `Shift Opened`, description: `Opening Cash: Ksh ${s.opening_cash}`, user: 'Staff', id: s.id
          });
          if (s.closed_at) {
            activities.push({
              type: 'SHIFT', icon: '🏁', color: 'gray', date: s.closed_at,
              title: `Shift Closed`, description: `Closing Cash: Ksh ${s.closing_cash}`, user: 'Staff', id: `close-${s.id}`
            });
          }
        });
      }

      // Sort all by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return activities.slice(0, limit);

    } catch (err) {
      console.error("Error fetching activities", err);
      return [];
    }
  }
};