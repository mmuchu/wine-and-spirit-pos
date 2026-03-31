 // src/app/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";
import { formatCurrency } from "@/components/pos/utils";
import { expenseService } from "@/lib/services/expenseService";
import { db } from "@/lib/db"; // NEW: Import local database

export default function ExpensesPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("General");
  const [notes, setNotes] = useState("");
  
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any>(null);

  useEffect(() => {
    if (organizationId) {
      loadInitialData();
      loadCategories();
      syncPendingExpenses(); // NEW: Attempt to sync offline expenses on load
    }
  }, [organizationId]);

  // NEW: Listen for online event to sync immediately when connection returns
  useEffect(() => {
    const handleOnline = () => {
      console.log("Connection restored. Syncing expenses...");
      syncPendingExpenses();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [organizationId]);

  const loadCategories = async () => {
    if (!organizationId) return;
    try {
      const data = await expenseService.getCategories(organizationId);
      
      if (data && data.length > 0) {
        setCategories(data);
        setCategory(data[0].name); 
      } else {
        const defaults = [
          { id: 'def_1', name: 'General', cost_type: 'variable' },
          { id: 'def_2', name: 'Rent', cost_type: 'fixed' },
          { id: 'def_3', name: 'Utilities', cost_type: 'variable' },
          { id: 'def_4', name: 'Salaries', cost_type: 'fixed' },
          { id: 'def_5', name: 'Stock Purchase', cost_type: 'variable' },
          { id: 'def_6', name: 'Miscellaneous', cost_type: 'variable' }
        ];
        setCategories(defaults);
        setCategory('General');
      }
    } catch (err) {
      console.error("Failed to load categories, using defaults.", err);
      const defaults = [
        { id: 'def_1', name: 'General', cost_type: 'variable' },
        { id: 'def_2', name: 'Rent', cost_type: 'fixed' },
        { id: 'def_3', name: 'Utilities', cost_type: 'variable' }
      ];
      setCategories(defaults);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (!organizationId) return;
      
      const shift = await shiftService.getCurrentShift(organizationId);
      setCurrentShift(shift);

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

  // NEW: Function to sync offline expenses
  const syncPendingExpenses = async () => {
    if (!organizationId) return;
    
    try {
      const pendingExpenses = await db.expensesQueue
        .where('status').equals('pending')
        .toArray();

      if (pendingExpenses.length === 0) return;

      console.log(`Syncing ${pendingExpenses.length} offline expenses...`);

      for (const expense of pendingExpenses) {
        try {
          const { error } = await supabase.from('expenses').insert(expense.payload);
          
          if (!error) {
            // If successful, mark as synced (or delete)
            await db.expensesQueue.delete(expense.id!);
            console.log("Synced expense:", expense.id);
          } else {
            console.error("Failed to sync expense:", error);
            // Optional: update status to 'failed' if needed
          }
        } catch (syncError) {
          console.error("Error syncing item:", syncError);
        }
      }
      
      // Refresh the list to show newly synced items
      loadInitialData();
      
    } catch (err) {
      console.error("Error accessing local DB for sync:", err);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }

    if (!notes.trim()) {
      alert("Please enter a description or note.");
      return;
    }

    setSaving(true);

    try {
      const selectedCat = categories.find(c => c.name === category);
      
      // Prepare the payload
      const expensePayload = {
        organization_id: organizationId,
        shift_id: currentShift?.id || null,
        amount: amt,
        category: category,
        notes: notes.trim(),
        date: new Date().toISOString().split('T')[0],
        cost_type: selectedCat?.cost_type || 'variable'
      };

      // NEW: Check if online
      if (navigator.onLine) {
        // Try to save to Supabase
        const { error } = await supabase.from("expenses").insert(expensePayload);

        if (error) {
          // If online but DB error (e.g., constraint), throw to show alert
          throw error;
        }
        // Success
        setAmount("");
        setNotes("");
        loadInitialData();
      } else {
        // OFFLINE: Save to local IndexedDB
        await db.expensesQueue.add({
          payload: expensePayload,
          status: 'pending',
          createdAt: new Date()
        });
        
        alert("You are offline. Expense saved locally and will sync automatically when connected.");
        setAmount("");
        setNotes("");
        // Note: We don't reload from server here because we are offline
      }
      
    } catch (err: any) {
      // Fallback: If online save failed due to network, try saving locally
      if (!navigator.onLine || err.message?.includes('network')) {
         // Re-check payload construction just in case
         const selectedCat = categories.find(c => c.name === category);
         const expensePayload = {
            organization_id: organizationId,
            shift_id: currentShift?.id || null,
            amount: amt,
            category: category,
            notes: notes.trim(),
            date: new Date().toISOString().split('T')[0],
            cost_type: selectedCat?.cost_type || 'variable'
         };

         await db.expensesQueue.add({
          payload: expensePayload,
          status: 'pending',
          createdAt: new Date()
        });
        alert("Network error. Expense saved locally.");
        setAmount("");
        setNotes("");
      } else {
        alert(`Error: ${err.message}`);
      }
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
              className="w-full p-3 border rounded-lg bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
                <th className="p-3 text-left">Notes</th>
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
                    <td className="p-3 text-gray-500">{exp.notes || '-'}</td>
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