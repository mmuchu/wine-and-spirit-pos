 // src/app/customers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { customerService } from "@/lib/services/customerService";
import { formatCurrency } from "@/components/pos/utils";
import { RepaymentModal } from "@/components/customers/RepaymentModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isRepayOpen, setIsRepayOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data || []);
    } catch (error) {
      console.error("Failed to load customers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerService.addCustomer(newName, newPhone);
      setNewName("");
      setNewPhone("");
      setIsAdding(false);
      fetchCustomers();
    } catch (error: any) {
      alert(`Failed to add customer: ${error.message}`);
    }
  };

  const handleRepayment = async (amount: number) => {
    if (!selectedCustomer) return;
    try {
      await customerService.recordRepayment(selectedCustomer.id, amount);
      fetchCustomers(); 
    } catch (error) {
      throw error; 
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Debts</h1>
          <p className="text-sm text-gray-500 mt-1">Manage credit sales and repayments.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
        >
          {isAdding ? "Cancel" : "+ Add Customer"}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border mb-6 shadow-sm">
          <form onSubmit={handleAddCustomer} className="flex gap-4">
            <input
              type="text"
              placeholder="Customer Name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
              required
            />
            <input
              type="tel"
              placeholder="Phone (Optional)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-48 p-2 border rounded-lg"
            />
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
              Save
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-500">Customer</th>
                <th className="text-left p-4 font-semibold text-gray-500">Phone</th>
                <th className="text-right p-4 font-semibold text-gray-500">Balance Owed</th>
                <th className="text-center p-4 font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">No customers found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4 text-gray-500">{c.phone || '-'}</td>
                    <td className="p-4 text-right">
                      {Number(c.balance) > 0 ? (
                        <span className="font-bold text-red-600">{formatCurrency(c.balance)}</span>
                      ) : (
                        <span className="text-gray-400">Paid</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {Number(c.balance) > 0 && (
                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsRepayOpen(true);
                          }}
                          className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold hover:bg-green-100 transition"
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <RepaymentModal
        isOpen={isRepayOpen}
        onClose={() => setIsRepayOpen(false)}
        customer={selectedCustomer}
        onConfirm={handleRepayment}
      />
    </div>
  );
}