 // src/app/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

type Expense = {
  id: string;
  description: string | null;
  category: string | null;
  amount: number;
  cost_type: 'fixed' | 'variable' | null;
  date: string;
  created_at: string;
};

export default function ExpensesPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Salaries");
  const [amount, setAmount] = useState("");
  const [costType, setCostType] = useState<"fixed" | "variable">("fixed");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]); // Defaults to today

  useEffect(() => {
    if (organizationId) fetchExpenses();
  }, [organizationId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", organizationId)
        .order("date", { ascending: false })
        .limit(100);

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !amount) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .insert({
          organization_id: organizationId,
          description: description || null,
          category: category || null,
          amount: parseFloat(amount),
          cost_type: costType,
          date: expenseDate, // Uses the selected date
        })
        .select();

      if (error) throw error;

      // Reset form but keep the date and category for fast entry
      setDescription("");
      setAmount("");
      fetchExpenses();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      fetchExpenses();
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete");
    }
  };

  return (
    <div className="flex-1 bg-[#fafafa] p-5 overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">Expense Management</h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Track and categorize outflows</p>
        </div>
      </div>

      {/* Add Expense Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-5 shadow-sm">
        <h3 className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-4">Record New Expense</h3>
        
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-black focus:border-black outline-none"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Amount (Ksh)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold text-right focus:ring-1 focus:ring-black focus:border-black outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-black focus:border-black outline-none bg-white"
              >
                <option value="Salaries">Salaries</option>
                <option value="Rent">Rent</option>
                <option value="Utilities">Utilities</option>
                <option value="Supplies">Supplies</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Transport">Transport</option>
                <option value="Marketing">Marketing</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Cost Type</label>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCostType("fixed")}
                  className={`flex-1 py-2 text-[11px] font-bold transition-colors ${costType === 'fixed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setCostType("variable")}
                  className={`flex-1 py-2 text-[11px] font-bold transition-colors border-l border-gray-200 ${costType === 'variable' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Variable
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., April staff salaries..."
              className="w-full p-2 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-black focus:border-black outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !amount}
            className="w-full py-3 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Record Expense"}
          </button>
        </form>
      </div>

      {/* Expenses List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-gray-700">Recent Expenses</h2>
          <span className="text-[10px] text-gray-400 font-mono">{expenses.length} records</span>
        </div>
        
        {loading ? (
          <div className="p-10 text-center text-[11px] text-gray-400">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center text-[11px] text-gray-400">No expenses recorded yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 text-gray-700 font-mono">{exp.date}</td>
                  <td className="p-3 text-gray-800 font-medium truncate max-w-[200px]">{exp.description || "No description"}</td>
                  <td className="p-3">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {exp.category || "General"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${exp.cost_type === 'fixed' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                      {(exp.cost_type || 'variable').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-red-600 font-mono">- {formatCurrency(exp.amount)}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-9h9.968M9.26 9m9.968 9h-9.968M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.26 9v.008" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}