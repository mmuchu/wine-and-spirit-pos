 // src/components/inventory/LowStockAlert.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export function LowStockAlert() {
  const supabase = createClient();
  const [lowItems, setLowItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStock();
  }, []);

  const checkStock = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock, min_stock')
        .eq('is_active', true);

      if (error) throw error;

      // FIX: Added ': any' to parameter 'p'
      const low = (data || []).filter((p: any) => p.stock < (p.min_stock || 10));
      setLowItems(low);

      if (low.length > 0) {
        playAlarm();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playAlarm = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log("Audio play failed", e);
    }
  };

  if (loading || lowItems.length === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-red-100 rounded-full">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-red-800">Low Stock Alert!</h3>
          <p className="text-sm text-red-700 mb-2">
            {lowItems.length} items are below minimum level.
          </p>
          <div className="max-h-24 overflow-y-auto text-xs">
            {lowItems.slice(0, 3).map(item => (
              <p key={item.id} className="text-red-600">
                • {item.name}: <span className="font-bold">{item.stock} left</span>
              </p>
            ))}
            {lowItems.length > 3 && <p className="text-red-400">...and {lowItems.length - 3} more</p>}
          </div>
          <Link href="/inventory" className="mt-2 inline-block text-xs font-bold text-red-700 hover:text-red-800 underline">
            View Inventory
          </Link>
        </div>
      </div>
    </div>
  );
}