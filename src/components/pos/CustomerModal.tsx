// src/components/pos/CustomerModal.tsx
"use client";

import { useState, useEffect } from "react";
import { customerService } from "@/lib/services/customerService";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerId: string) => void;
}

export function CustomerModal({ isOpen, onClose, onConfirm }: CustomerModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadCustomers();
  }, [isOpen]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerService.getCustomers();
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    onConfirm(id);
    onClose();
  };

  if (!isOpen) return null;

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold">Select Customer for Credit</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>
        
        <div className="p-4">
          <input
            type="text"
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border rounded-lg mb-3"
          />
        </div>

        <div className="max-h-64 overflow-y-auto border-t">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No customers found.</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="w-full text-left p-4 hover:bg-gray-50 border-b flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.phone}</p>
                </div>
                {Number(c.balance) > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    Owes {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(c.balance)}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}