// src/app/reports/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { expenseService } from "@/lib/services/expenseService";

export default function ExpensesReportPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filter States
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (organizationId) {
      loadExpenses();
      loadCategories();
    }
  }, [organizationId, category, startDate, endDate]);

  const loadCategories = async () => {
    if (!organizationId) return;
    try {
      const data = await expenseService.getCategories(organizationId);
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const loadExpenses = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      let query = supabase
        .from("expenses")
        .select("id, created_at, amount, category, notes, shift_id, date")
        .eq("organization_id", organizationId)
        .order("date", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }
      if (startDate) {
        query = query.gte("date", startDate);
      }
      if (endDate) {
        query = query.lte("date", endDate);
      }

      const { data, error } = await query;
      if (!error && data) setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const handleExport = () => {
    if (expenses.length === 0) {
      alert("No data to export.");
      return;
    }

    const headers = ["Date", "Category", "Note", "Amount"];
    const rows = expenses.map(exp => 
      [
        exp.date, 
        exp.category || 'General', 
        `"${exp.notes || ''}"`, // Wrap notes in quotes to handle commas
        exp.amount
      ].join(",")
    );

    // Add Total row
    rows.push(`,,,${total}`);
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `Expenses_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses Report</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed view of all recorded expenses.</p>
        </div>
        <button 
          onClick={handleExport}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div className="flex items-end">
            <div className="w-full p-3 bg-gray-50 rounded-lg text-right">
              <p className="text-xs text-gray-400 font-bold uppercase">Total Expenses</p>
              <p className="text-xl font-extrabold text-red-600">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading expenses...</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Note</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">
                      No expenses found for selected filters.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-600">{exp.date}</td>
                      <td className="p-3 font-medium text-gray-800">{exp.category || 'General'}</td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">{exp.notes || '-'}</td>
                      <td className="p-3 text-right font-bold text-red-600">- {formatCurrency(exp.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}