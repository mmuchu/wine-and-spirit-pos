 // src/app/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";

export default function ExpensesPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any>(null);

  useEffect(() => {
    if (organizationId) {
      loadInitialData();
    }
  }, [organizationId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Get Active Shift
      if (!organizationId) {
        console.error("Organization ID is missing");
        return;
      }
      
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);

      // 2. Load Expenses for this shift (or today)

      // 2. Load Expenses for this shift (or today)
      let query = supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (shift) {
        query = query.eq("shift_id", shift.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !amount) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("expenses").insert({
        organization_id: organizationId,
        shift_id: currentShift?.id || null, // Link to shift!
        amount: parseFloat(amount),
        category: category,
        description: description,
      });

      if (error) throw error;

      // Reset form
      setAmount("");
      setDescription("");
      
      // Refresh list
      loadInitialData();
      
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">
            {currentShift ? "Recording expenses for active shift." : "No active shift. Expenses will be unassigned."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(expenses.reduce((sum, e) => sum + (e.amount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-lg">New Expense</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border rounded-lg"
            >
              <option>General</option>
              <option>Utilities</option>
              <option>Salaries</option>
              <option>Rent</option>
              <option>Stock Purchase</option>
              <option>Miscellaneous</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Amount (Ksh)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description / Notes</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Bought cleaning supplies"
            className="w-full p-3 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !amount}
          className="w-full py-3 bg-black text-white rounded-lg font-bold disabled:bg-gray-300"
        >
          {saving ? "Saving..." : "Save Expense"}
        </button>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-gray-800">Recent Expenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No expenses recorded.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600">{new Date(exp.created_at).toLocaleTimeString()}</td>
                    <td className="p-3 font-medium text-gray-800">{exp.category || 'General'}</td>
                    <td className="p-3 text-gray-500">{exp.description || '-'}</td>
                    <td className="p-3 text-right font-bold text-red-600">- {formatCurrency(exp.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}