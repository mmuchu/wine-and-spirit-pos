 // src/lib/services/auditService.ts
import { createClient } from "@/lib/supabase/client";

export const auditService = {
  // Updated to accept organizationId
  async log(action: string, details: string, organizationId?: string, meta: object = {}) {
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        organization_id: organizationId, // Save the ID
        action,
        details,
        meta
      });
    } catch (e) {
      console.error("Audit log failed", e);
    }
  },

  // GET all activities
  async getActivities(organizationId: string, limit: number = 50) {
    const supabase = createClient();
    const activities: any[] = [];

    try {
      // 1. Fetch Sales
      const { data: sales } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, payment_method, profiles(full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      sales?.forEach(s => activities.push({
        type: 'SALE',
        icon: '💰',
        color: 'green',
        date: s.created_at,
        title: `Sale: ${s.payment_method.toUpperCase()}`,
        description: `Total: Ksh ${s.total_amount}`,
        user: s.profiles?.full_name || 'User',
        id: s.id
      }));

      // 2. Fetch Stock Movements
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*, products(name), profiles(full_name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      movements?.forEach(m => {
        const isPurchase = m.type === 'purchase';
        activities.push({
          type: 'STOCK',
          icon: isPurchase ? '📦' : '⚙️',
          color: isPurchase ? 'blue' : 'orange',
          date: m.created_at,
          title: `${m.type.toUpperCase()}: ${m.products?.name || 'Product'}`,
          description: `Qty: ${m.quantity > 0 ? '+' : ''}${m.quantity}. ${m.notes || ''}`,
          user: m.profiles?.full_name || 'System',
          id: m.id
        });
      });

      // 3. Fetch Shifts
      const { data: shifts } = await supabase
        .from('shifts')
        .select('*, profiles(full_name)')
        .eq('organization_id', organizationId)
        .order('opened_at', { ascending: false })
        .limit(limit);

      shifts?.forEach(s => {
        activities.push({
          type: 'SHIFT',
          icon: '⏰',
          color: 'purple',
          date: s.opened_at,
          title: `Shift Opened`,
          description: `Opening Cash: Ksh ${s.opening_cash}`,
          user: s.profiles?.full_name || 'User',
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
            user: s.profiles?.full_name || 'User',
            id: `close-${s.id}`
          });
        }
      });

      // 4. Fetch Audit Logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*, profiles(full_name)')
        .eq('organization_id', organizationId) // Only logs for this shop
        .order('created_at', { ascending: false })
        .limit(limit);

      logs?.forEach(l => {
        activities.push({
          type: 'LOG',
          icon: l.action.includes('LOGIN') ? '🔑' : '📝',
          color: 'black',
          date: l.created_at,
          title: l.action,
          description: l.details,
          user: l.profiles?.full_name || 'User',
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