 // src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { expenseService } from "@/lib/services/expenseService"; // NEW: Import service

export default function SettingsPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  
  // New Fields
  const [mpesaTill, setMpesaTill] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // NEW: Category State
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"fixed" | "variable">("variable");
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchSettings();
      fetchCategories(); // NEW: Load categories
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error; 

      if (data) {
        setShopName(data.shop_name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setVatEnabled(data.vat_enabled ?? true);
        setMpesaTill(data.mpesa_till || "");
        setWebsiteUrl(data.website_url || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Function to fetch categories
  const fetchCategories = async () => {
    if (!organizationId) return;
    try {
      const data = await expenseService.getCategories(organizationId);
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          organization_id: organizationId,
          shop_name: shopName,
          address: address,
          phone: phone,
          vat_enabled: vatEnabled,
          mpesa_till: mpesaTill,
          website_url: websiteUrl
        }, { onConflict: 'organization_id' });

      if (error) throw error;
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // NEW: Function to add category
  const handleAddCategory = async () => {
    if (!organizationId || !newCatName.trim()) return;
    setAddingCategory(true);
    try {
      await expenseService.addCategory({
        organization_id: organizationId,
        name: newCatName.trim(),
        cost_type: newCatType
      });
      setNewCatName(""); // Reset input
      fetchCategories(); // Refresh list
    } catch (err: any) {
      alert(`Error adding category: ${err.message}`);
    } finally {
      setAddingCategory(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your shop details.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
        
        {/* Shop Details */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold border-b pb-2">Shop Details</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="My Wine Shop"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="123 Main St, Nairobi"
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
            <label className="block text-sm font-medium mb-1">Website / Social Media URL</label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="https://myshop.co.ke or https://instagram.com/myshop"
            />
            <p className="text-xs text-gray-400 mt-1">This link will appear in your Admin Dashboard.</p>
          </div>
        </div>

        {/* M-PESA Details */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-bold border-b pb-2">M-Pesa Details</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Paybill / Till Number</label>
            <input
              type="text"
              value={mpesaTill}
              onChange={(e) => setMpesaTill(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="522522"
            />
            <p className="text-xs text-gray-400 mt-1">This will appear on receipts for M-Pesa payments.</p>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-bold border-b pb-2">Taxation</h2>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Enable VAT (16%)</p>
              <p className="text-xs text-gray-500">Add 16% VAT to all sales</p>
            </div>
            <button
              onClick={() => setVatEnabled(!vatEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${vatEnabled ? 'bg-black' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${vatEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
            </button>
          </div>
        </div>

        {/* NEW: Expense Categories Section */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-bold border-b pb-2">Expense Categories</h2>
          
          {/* Add New Category Form */}
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-1">Category Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="e.g. Rent, Transport, Salaries"
              />
            </div>
            <div className="w-full md:w-40">
              <label className="block text-sm font-medium mb-1">Type</label>
              <select 
                value={newCatType} 
                onChange={(e) => setNewCatType(e.target.value as any)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="variable">Variable</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <button
              onClick={handleAddCategory}
              disabled={addingCategory || !newCatName.trim()}
              className="w-full md:w-auto px-6 py-3 bg-gray-800 text-white rounded-lg font-medium disabled:bg-gray-300"
            >
              {addingCategory ? "Adding..." : "Add"}
            </button>
          </div>

          {/* List of Existing Categories */}
          <div className="mt-4 space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No categories added yet.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${cat.cost_type === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {cat.cost_type.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-black text-white rounded-lg font-bold disabled:bg-gray-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}