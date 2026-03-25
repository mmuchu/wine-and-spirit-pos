 // src/lib/services/shiftService.ts
import { createClient } from "@/lib/supabase/client";

export const shiftService = {
  async getCurrentShift(organizationId: string | null) {
    if (!organizationId) return null;
    
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('organization_id', organizationId)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error("Error fetching shift:", error);
      return null;
    }
    
    return data;
  },

  async openShift(organizationId: string, openingCash: number = 0) {
    const supabase = createClient();
    
    // 1. Get User
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated.");
    }

    // 2. Get current stock levels for snapshot
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, stock')
      .eq('organization_id', organizationId);

    if (prodError) {
      console.error("Product fetch error:", prodError);
      throw new Error(`Failed to fetch products: ${prodError.message}`);
    }

    const stockSnapshot: Record<string, number> = {};
    products?.forEach(p => {
      if (p.id) stockSnapshot[p.id] = p.stock || 0;
    });

    // 3. Insert Shift
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        organization_id: organizationId,
        opened_by: user.id,
        opening_cash: openingCash,
        opening_stock: stockSnapshot,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Error:", JSON.stringify(error, null, 2));
      throw new Error(`Database Error: ${error.message}`);
    }

    return data;
  },

  async closeShift(shiftId: string, closingCash: number, closingStock: any, notes: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('shifts')
      .update({
        closed_at: new Date().toISOString(),
        closed_by: user?.id,
        closing_cash: closingCash,
        closing_stock: closingStock,
        status: 'closed',
        notes: notes
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getShiftDetails(shiftId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('shifts')
      .select(`
        *,
        profiles ( full_name )
      `)
      .eq('id', shiftId)
      .single();

    if (error) throw error;
    return data;
  },

  async getShiftSales(shiftId: string, openedAt: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('sales')
      .select('total_amount')
      .eq('shift_id', shiftId)
      .eq('status', 'completed');

    if (error) throw error;

    const total = data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
    return total;
  },

  async getStockMovements(shiftId: string) {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, products(name)')
      .eq('shift_id', shiftId);

    if (error) throw error;
    return data;
  }
};