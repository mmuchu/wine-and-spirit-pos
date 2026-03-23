 // src/lib/services/auditService.ts
import { createClient } from "@/lib/supabase/client";

export const auditService = {
  async log(action: string, details: string, organizationId?: string, meta: object = {}) {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: organizationId,
        action,
        details,
        meta
      });
    } catch (e) {
      console.error("Audit log failed", e);
    }
  },

  async getActivities(organizationId: string, limit: number = 50) {
    const supabase = createClient();
    const activities: any[] = [];

    try {
      // 1. Fetch Sales (Simplified - removed 'profiles' join which might fail)
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, payment_method')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (salesError) throw salesError;

      sales?.forEach(s => activities.push({
        type: 'SALE',
        icon: '💰',
        color: 'green',
        date: s.created_at,
        title: `Sale: ${s.payment_method.toUpperCase()}`,
        description: `Total: Ksh ${s.total_amount}`,
        user: 'Staff', // Simplified
        id: s.id
      }));

      // 2. Fetch Stock Movements
      const { data: movements, error: movError } = await supabase
        .from('stock_movements')
        .select('*, products(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (movError) throw movError;

      movements?.forEach(m => {
        const isPurchase = m.type === 'purchase';
        activities.push({
          type: 'STOCK',
          icon: isPurchase ? '📦' : '⚙️',
          color: isPurchase ? 'blue' : 'orange',
          date: m.created_at,
          title: `${m.type.toUpperCase()}: ${m.products?.name || 'Product'}`,
          description: `Qty: ${m.quantity > 0 ? '+' : ''}${m.quantity}. ${m.notes || ''}`,
          user: 'Staff',
          id: m.id
        });
      });

      // 3. Fetch Shifts
      const { data: shifts, error: shiftError } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .order('opened_at', { ascending: false })
        .limit(limit);

      if (shiftError) throw shiftError;

      shifts?.forEach(s => {
        activities.push({
          type: 'SHIFT',
          icon: '⏰',
          color: 'purple',
          date: s.opened_at,
          title: `Shift Opened`,
          description: `Opening Cash: Ksh ${s.opening_cash}`,
          user: 'Staff',
          id: s.id
        });
        if (s.closed_at) {
          activities.push({
            type: 'SHIFT',
            icon: '🏁',
            color: 'gray',
            date: s.closed_at,
            title: `Shift Closed`,
            description: `Closing Cash: Ksh ${s.closing_cash}`,
            user: 'Staff',
            id: `close-${s.id}`
          });
        }
      });

      // 4. Fetch Audit Logs
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logsError) throw logsError;

      logs?.forEach(l => {
        activities.push({
          type: 'LOG',
          icon: l.action.includes('LOGIN') ? '🔑' : '📝',
          color: 'black',
          date: l.created_at,
          title: l.action,
          description: l.details,
          user: 'Staff',
          id: l.id
        });
      });

      // Sort all by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return activities.slice(0, limit);

    } catch (err) {
      console.error("Error fetching activities", err);
      return [];
    }
  }
};