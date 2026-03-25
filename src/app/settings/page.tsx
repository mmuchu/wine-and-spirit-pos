 // src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";

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

  useEffect(() => {
    if (organizationId) fetchSettings();
  }, [organizationId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      if (data) {
        setShopName(data.shop_name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setVatEnabled(data.vat_enabled ?? true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
          vat_enabled: vatEnabled
        }, { onConflict: 'organization_id' });

      if (error) throw error;
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
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
        </div>

        {/* Tax Settings */}
        <div className="space-y-4 pt-4">
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