 // src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { settingsService } from "@/lib/services/settingsService";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function SettingsPage() {
  const supabase = createClient();
  const { organizationId, loading: orgLoading } = useOrganization();
  
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Wait for org context to finish loading
    if (!orgLoading && organizationId) {
      loadSettings();
    }
  }, [organizationId, orgLoading]);

  const loadSettings = async () => {
    if (!organizationId) return;
    setLoading(true);
    const data = await settingsService.getSettings(organizationId);
    setSettings(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!organizationId || !settings) return;
    
    setSaving(true);
    try {
      await settingsService.updateSettings(organizationId, {
        shop_name: settings.shop_name,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        mpesa_paybill: settings.mpesa_paybill,
        mpesa_till: settings.mpesa_till
      });
      alert("Settings saved!");
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (orgLoading || loading) return <div className="p-8">Loading settings...</div>;
  if (!settings) return <div className="p-8">No settings found.</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your business details.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm max-w-2xl space-y-4">
        
        <div>
          <label className="block text-sm font-medium mb-1">Shop Name</label>
          <input
            type="text"
            value={settings.shop_name || ''}
            onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            value={settings.address || ''}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              value={settings.phone || ''}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={settings.email || ''}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-bold mb-2">M-Pesa Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Paybill Number</label>
              <input
                type="text"
                value={settings.mpesa_paybill || ''}
                onChange={(e) => setSettings({ ...settings, mpesa_paybill: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Till Number</label>
              <input
                type="text"
                value={settings.mpesa_till || ''}
                onChange={(e) => setSettings({ ...settings, mpesa_till: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}