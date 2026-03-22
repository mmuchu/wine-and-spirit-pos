 // src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { settingsService } from "@/lib/services/settingsService";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { useRole } from "@/lib/hooks/useRole";

export default function SettingsPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const { isAdmin, isOwner } = useRole();

  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isAdmin && !isOwner) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-500 mt-2">You do not have permission.</p>
      </div>
    );
  }

  useEffect(() => {
    if (organizationId) fetchSettings();
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const data = await settingsService.getSettings(organizationId);
      setSettings(data);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      await settingsService.upsertSettings(organizationId, settings);
      alert("Settings saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Shop Name</label>
          <input
            type="text"
            value={settings?.shop_name || ''}
            onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input
            type="text"
            value={settings?.address || ''}
            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="text"
            value={settings?.phone || ''}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">M-Pesa Paybill</label>
          <input
            type="text"
            value={settings?.mpesa_paybill || ''}
            onChange={(e) => setSettings({ ...settings, mpesa_paybill: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* VAT TOGGLE SECTION */}
        <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
                <div>
                    <label className="block text-sm font-bold text-gray-800">Enable VAT (16%)</label>
                    <p className="text-xs text-gray-500">Toggle to calculate Value Added Tax on sales.</p>
                </div>
                <button
                    onClick={() => setSettings({ ...settings, vat_enabled: !settings?.vat_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings?.vat_enabled ? 'bg-black' : 'bg-gray-200'
                    }`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.vat_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                </button>
            </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}