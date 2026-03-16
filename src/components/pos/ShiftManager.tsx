// src/components/pos/ShiftManager.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shift } from "@/lib/types";
import { formatCurrency } from "./utils";

export function ShiftManager({ onShiftChange }: { onShiftChange: () => void }) {
  const supabase = createClient();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("0");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchActiveShift();
  }, []);

  const fetchActiveShift = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      setActiveShift(data || null);
    } catch (err) {
      console.error("Error fetching shift", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("shifts")
        .insert({
          user_id: user?.id,
          opening_cash: parseFloat(openingCash) || 0,
          status: "open",
          organization_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' // TODO: Replace with dynamic org ID
        })
        .select()
        .single();

      if (error) throw error;
      setActiveShift(data);
      setIsStartModalOpen(false);
      onShiftChange();
    } catch (err) {
      alert("Failed to start shift");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    setProcessing(true);
    try {
      // 1. Calculate total sales during this shift
      const { data: sales } = await supabase
        .from("sales")
        .select("total_amount, payment_method")
        .eq("shift_id", activeShift.id);

      // Calculate totals
      const totals = (sales || []).reduce((acc, sale) => {
        acc.total += sale.total_amount || 0;
        if (sale.payment_method === 'Cash') acc.cash += sale.total_amount || 0;
        return acc;
      }, { total: 0, cash: 0 });

      // Expected Cash = Opening Cash + Cash Sales
      const expectedCash = (activeShift.opening_cash || 0) + totals.cash;
      const closingCashNum = parseFloat(closingCash) || 0;

      // 2. Close shift
      const { error } = await supabase
        .from("shifts")
        .update({
          status: "closed",
          closing_cash: closingCashNum,
          expected_cash: expectedCash,
          closed_at: new Date().toISOString(),
        })
        .eq("id", activeShift.id);

      if (error) throw error;

      // 3. Show report (simplified for now)
      const variance = closingCashNum - expectedCash;
      alert(
        `Shift Closed!\n\n` +
        `Expected Cash: ${formatCurrency(expectedCash)}\n` +
        `Actual Cash: ${formatCurrency(closingCashNum)}\n` +
        `Variance: ${formatCurrency(variance)}`
      );

      setActiveShift(null);
      setIsEndModalOpen(false);
      onShiftChange();
    } catch (err) {
      alert("Failed to end shift");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Checking shift status...</div>;

  return (
    <div className="mb-4">
      {!activeShift ? (
        <button
          onClick={() => setIsStartModalOpen(true)}
          className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition shadow-md"
        >
          Start Shift
        </button>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-800 uppercase">Shift in Progress</p>
              <p className="text-sm text-blue-600 font-medium">
                Drawer: {formatCurrency(activeShift.opening_cash)}
              </p>
            </div>
            <button
              onClick={() => setIsEndModalOpen(true)}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-md hover:bg-red-200 transition"
            >
              End Shift
            </button>
          </div>
        </div>
      )}

      {/* Start Shift Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">Start New Shift</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Starting Cash in Drawer</label>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsStartModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-lg font-semibold">Cancel</button>
              <button onClick={handleStartShift} disabled={processing} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold">Start</button>
            </div>
          </div>
        </div>
      )}

      {/* End Shift Modal */}
      {isEndModalOpen && activeShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">End Shift</h3>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Opening Cash:</span>
                <span className="font-medium">{formatCurrency(activeShift.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pt-1 mt-1 border-t">
                <span>+ Cash Sales (calculated):</span>
                <span className="font-medium">Auto-calculated</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Counted Cash in Drawer</label>
              <input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="w-full p-3 border rounded-lg text-lg"
                placeholder="0.00"
              />
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setIsEndModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-lg font-semibold">Cancel</button>
              <button onClick={handleEndShift} disabled={processing} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold">
                {processing ? "Processing..." : "Close Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}