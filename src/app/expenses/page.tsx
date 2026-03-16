 // src/app/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { expenseService } from "@/lib/services/expenseService";
import { formatCurrency } from "@/components/pos/utils";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Rent");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getExpenses();
      setExpenses(data || []);
    } catch (error) {
      console.error("Failed to load expenses", error);
      alert("Failed to load expenses. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await expenseService.addExpense({
        description,
        amount: Number(amount),
        category,
        date
      });
      
      // Reset form
      setDescription("");
      setAmount("");
      setIsAdding(false);
      fetchExpenses();
    } catch (error: any) {
      console.error("Full Error Object:", error);
      // THIS WILL NOW SHOW THE REAL ERROR
      alert(`Failed to add expense: ${error.message || JSON.stringify(error)}`);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Record business costs to calculate net profit.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
        >
          {isAdding ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {/* Add Expense Form */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl border mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">New Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Category</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:ring-1 focus:ring-black"
                >
                  <option>Rent</option>
                  <option>Utilities</option>
                  <option>Salaries</option>
                  <option>Stock Purchase</option>
                  <option>Marketing</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Description</label>
              <input
                type="text"
                placeholder="e.g., January Rent"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Amount (Ksh)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black text-lg font-semibold"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
            >
              Save Expense
            </button>
          </form>
        </div>
      )}

      {/* Expenses List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No expenses recorded</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-500">Date</th>
                <th className="text-left p-4 font-semibold text-gray-500">Description</th>
                <th className="text-left p-4 font-semibold text-gray-500">Category</th>
                <th className="text-right p-4 font-semibold text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-600">
                    {new Date(exp.date).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-medium text-gray-900">{exp.description}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-red-500">
                    - {formatCurrency(exp.amount)}
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