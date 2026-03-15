 // src/hooks/useOfflineSync.ts
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { Product } from '@/lib/types';

export function useOfflineSync() {
  const supabase = createClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueuedSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("products")
          .select("id, organization_id, category_id, name, price, sku, stock, image_url, is_active, categories ( name )")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;

        const list = (data || []).map((item) => ({ ...item, price: Number(item.price) }));
        
        await db.products.clear();
        await db.products.bulkPut(list);
        
        setProducts(list as Product[]);
      } else {
        const localProducts = await db.products.toArray();
        setProducts(localProducts as Product[]);
      }
    } catch (error) {
      console.error("Fetch failed, trying local cache:", error);
      const localProducts = await db.products.toArray();
      setProducts(localProducts as Product[]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const saveSale = useCallback(async (saleRecord: any) => {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from("sales").insert(saleRecord).select("id").single();
        if (error) throw error;
        return { success: true, id: data.id, queued: false };
      } catch (error) {
        console.error("Online save failed, queueing...", error);
        await queueSale(saleRecord);
        return { success: true, queued: true };
      }
    } else {
      await queueSale(saleRecord);
      return { success: true, queued: true };
    }
  }, [supabase]);

  const queueSale = async (saleRecord: any) => {
    await db.salesQueue.add({
      payload: saleRecord,
      status: 'pending',
      createdAt: new Date()
    });
  };

  const syncQueuedSales = async () => {
    if (!navigator.onLine) return;
    const pendingSales = await db.salesQueue.where('status').equals('pending').toArray();
    if (pendingSales.length === 0) return;

    for (const sale of pendingSales) {
      try {
        const { error } = await supabase.from("sales").insert(sale.payload);
        if (error) throw error;
        await db.salesQueue.delete(sale.id!);
      } catch (error) {
        console.error("Sync failed for sale:", sale.id);
      }
    }
  };

  return { isOnline, products, loading, fetchProducts, saveSale };
}