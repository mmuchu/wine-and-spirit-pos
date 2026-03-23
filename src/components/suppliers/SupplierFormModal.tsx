 // src/components/suppliers/SupplierFormModal.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: any;
}

export function SupplierFormModal({ isOpen, onClose, onSuccess, supplier }: Props) {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [name, setName] = useState(supplier?.name || "");
  const [contact, setContact] = useState(supplier?.contact || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!organizationId) return;
    if (!name) return alert("Supplier Name is required.");

    setLoading(true);
    try {
      if (supplier?.id) {
        const { error } = await supabase
          .from('suppliers')
          .update({ name, contact, phone })
          .eq('id', supplier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            organization_id: organizationId,
            name,
            contact,
            phone
          });
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gray-900 p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">{supplier ? "Edit Supplier" : "Add New Supplier"}</h2>
          <button onClick={onClose} className="text-3xl text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supplier Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="e.g. Kenya Wine Agencies"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Person</label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="e.g. John Kamau"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="e.g. 0722 000 000"
            />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 border rounded-lg font-bold hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-black text-white rounded-lg font-bold disabled:bg-gray-300"
          >
            {loading ? "Saving..." : "Save Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}