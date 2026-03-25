 // src/app/suppliers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function SuppliersPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organizationId) loadSuppliers();
  }, [organizationId]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('suppliers').insert({
        organization_id: organizationId,
        name: name,
        phone: phone,
        contact: contact
      });

      if (error) throw error;
      
      setName("");
      setPhone("");
      setContact("");
      loadSuppliers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading suppliers...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your vendors and distributors.</p>
      </div>

      {/* Add Form */}
      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-lg border-b pb-2">Add New Supplier</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supplier Name *</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full p-3 border rounded-lg" 
              placeholder="e.g., Coca Cola Ltd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="w-full p-3 border rounded-lg" 
              placeholder="0722 000 000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Person</label>
            <input 
              type="text" 
              value={contact} 
              onChange={(e) => setContact(e.target.value)} 
              className="w-full p-3 border rounded-lg" 
              placeholder="John Doe"
            />
          </div>
        </div>

        <button 
          onClick={handleAddSupplier}
          disabled={saving || !name}
          className="px-6 py-2 bg-black text-white rounded-lg font-bold disabled:bg-gray-300"
        >
          {saving ? "Saving..." : "Add Supplier"}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left font-bold">Name</th>
              <th className="p-4 text-left font-bold">Contact</th>
              <th className="p-4 text-left font-bold">Phone</th>
              <th className="p-4 text-left font-bold">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  No suppliers found. Add one above or create via Inventory Purchase.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{s.name}</td>
                  <td className="p-4 text-gray-500">{s.contact || '-'}</td>
                  <td className="p-4 text-gray-500">{s.phone || '-'}</td>
                  <td className="p-4 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}