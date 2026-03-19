 // src/components/pos/CustomerModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { customerService } from "@/lib/services/customerService"; // IMPORT ADDED

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: any) => void;
}

export function CustomerModal({ isOpen, onClose, onSelect }: CustomerModalProps) {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    if (isOpen && organizationId) {
      loadCustomers();
    }
  }, [isOpen, organizationId]);

  const loadCustomers = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await customerService.getCustomers(organizationId);
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (!organizationId) return;

    if (term.length > 0) {
      const results = await customerService.searchCustomers(term, organizationId);
      setCustomers(results);
    } else {
      loadCustomers();
    }
  };

  const handleAddCustomer = async () => {
    if (!newName || !organizationId) return;
    
    try {
      const data = await customerService.addCustomer(newName, newPhone, organizationId);
      setCustomers(prev => [...prev, data]);
      handleSelect(data);
      setIsAddingNew(false);
      setNewName("");
      setNewPhone("");
    } catch (err: any) {
      alert(err.message || "Failed to add customer");
    }
  };

  const handleSelect = (customer: any) => {
    onSelect(customer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Select Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full p-3 border border-gray-200 rounded-lg text-sm"
        />

        {isAddingNew ? (
          <div className="space-y-3 border-t pt-4">
            <input
              type="text"
              placeholder="Customer Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-2">
              <button onClick={() => setIsAddingNew(false)} className="flex-1 py-2 border rounded">Cancel</button>
              <button onClick={handleAddCustomer} className="flex-1 py-2 bg-black text-white rounded font-bold">Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {loading ? (
                <p className="text-center text-sm text-gray-400 p-4">Loading...</p>
              ) : customers.length === 0 ? (
                <p className="text-center text-sm text-gray-400 p-4">No customers found.</p>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border"
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone || 'No phone'}</p>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full py-2 text-sm text-blue-600 hover:underline font-medium"
            >
              + Add New Customer
            </button>
          </>
        )}
      </div>
    </div>
  );
}