 // src/app/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { shiftService } from "@/lib/services/shiftService";

export default function ExpensesPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Utilities',
    cost_type: 'variable', // NEW
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      checkShift();
      fetchExpenses();
    }
  }, [organizationId]);

  const checkShift = async () => {
    const shift = await shiftService.getCurrentShift();
    if (shift) setCurrentShiftId(shift.id);
  };

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
      await supabase.from('expenses').insert({
        organization_id: organizationId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        cost_type: formData.cost_type, // NEW
        date: formData.date,
        shift_id: currentShiftId
      });
      
      setIsModalOpen(false);
      setFormData({ description: '', amount: '', category: 'Utilities', cost_type: 'variable', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    } catch (err) {
      alert("Failed to save expense.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const totalFixed = expenses.filter(e => e.cost_type === 'fixed').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalVariable = expenses.filter(e => e.cost_type === 'variable').reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Track business costs.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800"
        >
          + Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total Fixed Costs</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalFixed)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Total Variable Costs</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalVariable)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm text-gray-500">Grand Total</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalFixed + totalVariable)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold">Date</th>
              <th className="text-left p-4 font-semibold">Description</th>
              <th className="text-left p-4 font-semibold">Type</th>
              <th className="text-right p-4 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No expenses recorded.</td></tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="p-4 text-gray-500">{exp.date}</td>
                  <td className="p-4 font-medium">{exp.description}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${exp.cost_type === 'fixed' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                        {exp.cost_type ? exp.cost_type.charAt(0).toUpperCase() + exp.cost_type.slice(1) : 'Variable'}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-red-600">{formatCurrency(exp.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">Add Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-2 border rounded" required />
              <input type="text" placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded" required />
              
              <div className="grid grid-cols-2 gap-2">
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded">
                  <option>Utilities</option>
                  <option>Rent</option>
                  <option>Salaries</option>
                  <option>Stock Purchase</option>
                  <option>Misc</option>
                </select>
                
                {/* NEW: Cost Type Selector */}
                <select value={formData.cost_type} onChange={(e) => setFormData({...formData, cost_type: e.target.value})} className="w-full p-2 border rounded font-medium">
                  <option value="variable">Variable Cost</option>
                  <option value="fixed">Fixed Cost</option>
                </select>
              </div>

              <input type="number" placeholder="Amount (Ksh)" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border rounded" required />
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-black text-white rounded font-bold">{submitting ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}