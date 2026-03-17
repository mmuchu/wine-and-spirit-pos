 // src/components/pos/CustomerModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: any) => void;
  organizationId: string | null; // NEW PROP
}

export function CustomerModal({ isOpen, onClose, onSelectCustomer, organizationId }: Props) {
  const supabase = createClient();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      setIsAdding(false);
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pass organizationId to the service
      const data = await customerService.addCustomer(newName, newPhone, organizationId);
      setCustomers(prev => [...prev, data]);
      handleSelect(data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSelect = (customer: any) => {
    onSelectCustomer(customer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold">Select Customer for Credit</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="w-full text-center text-sm text-blue-600 font-semibold hover:underline"
          >
            {isAdding ? "Cancel" : "+ Add New Customer"}
          </button>
          
          {isAdding && (
            <form onSubmit={handleAddCustomer} className="mt-4 space-y-2">
              <input 
                type="text" 
                placeholder="Name" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                required
              />
              <input 
                type="tel" 
                placeholder="Phone (Optional)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <button type="submit" className="w-full bg-black text-white p-2 rounded text-sm font-bold">
                Save & Select
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
          ) : customers.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">No customers found.</div>
          ) : (
            <div className="divide-y">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="w-full text-left p-4 hover:bg-blue-50 transition flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                  </div>
                  <span className="text-xs text-red-500 font-semibold">
                    Bal: Ksh {c.balance?.toFixed(2) || '0.00'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}