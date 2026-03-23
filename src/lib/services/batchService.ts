import { createClient } from "@/lib/supabase/client";
import { Batch } from "@/lib/types";

export const batchService = {
  async createBatch(batch: Omit<Batch, 'id' | 'created_at'>) {
    const supabase = createClient();
    
    // 1. Insert Batch
    const { data, error } = await supabase
      .from('batches')
      .insert(batch)
      .select()
      .single();

    if (error) throw error;

    // 2. Update Product Stock & Cost (Moving Average)
    // TODO: Implement Moving Average Logic
    
    return data;
  },

  async getBatches(productId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('product_id', productId)
      .gt('quantity_remaining', 0);

    if (error) throw error;
    return data;
  }
};