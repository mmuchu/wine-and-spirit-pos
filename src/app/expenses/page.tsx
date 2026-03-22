 // src/app/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { useRole } from "@/lib/hooks/useRole";

export default function ExpensesPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const { isManager, isAdmin, isOwner } = useRole();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Utilities',
    cost_type: 'variable', // Default to variable
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (organizationId) fetchExpenses();
  }, [organizationId]);

  const fetchExpenses = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        organization_id: organizationId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        cost_type: formData.cost_type,
        date: formData.date
      });

      if (error) throw error;
      
      setFormData({ description: '', amount: '', category: 'Utilities', cost_type: 'variable', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await supabase.from('expenses').delete().eq('id', id);
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  // Permission check
  const canManage = isManager || isAdmin || isOwner;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Track your business costs.</p>
        </div>
      </div>

      {/* Add Expense Form */}
      {canManage && (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-lg font-bold mb-4">Record New Expense</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input 
                type="date" 
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="Utilities">Utilities</option>
                <option value="Rent">Rent</option>
                <option value="Salaries">Salaries</option>
                <option value="Stock Purchase">Stock Purchase</option>
                <option value="Misc">Misc</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost Type</label>
              <select 
                value={formData.cost_type}
                onChange={(e) => setFormData({ ...formData, cost_type: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="variable">Variable Cost</option>
                <option value="fixed">Fixed Cost</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (Ksh)</label>
              <input 
                type="number" 
                required
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                         <label className="block text-sm font-medium mb-1">Description</label>
                         <input 
                           type="text" 
                           required
                           placeholder="Description"
                           value={formData.description}
                           onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                           className="w-full p-2 border rounded"
                         />
                    </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="px-6 py-2 bg-black text-white rounded font-bold hover:bg-gray-800 disabled:bg-gray-300 h-[42px] self-end"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* CONTAINER ENABLES VERTICAL SCROLL */}
        <div className="table-container overflow-x-auto">
          <table className="w-full text-sm sticky-header">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-left p-3 font-semibold">Type</th>
                <th className="text-left p-3 font-semibold">Description</th>
                <th className="text-right p-3 font-semibold">Amount</th>
                {canManage && <th className="text-right p-3 font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No expenses recorded.</td></tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="p-3">{exp.category}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${exp.cost_type === 'fixed' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {exp.cost_type}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate">{exp.description}</td>
                    <td className="p-3 text-right font-bold text-red-600">{formatCurrency(exp.amount)}</td>
                    {canManage && (
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleDelete(exp.id)}
                          className="text-xs text-red-500 hover:underline font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    )}
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