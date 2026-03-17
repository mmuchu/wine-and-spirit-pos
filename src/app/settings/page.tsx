 // src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { settingsService } from "@/lib/services/settingsService";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    shop_name: '',
    address: '',
    phone: '',
    vat_number: '',
    receipt_footer: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings(settings);
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your business details for receipts and reports.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        
        <div>
          <label className="block text-sm font-medium mb-1">Shop Name</label>
          <input 
            type="text" 
            value={settings.shop_name}
            onChange={(e) => setSettings({...settings, shop_name: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="Kenyan Spirit"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <input 
            type="text" 
            value={settings.address}
            onChange={(e) => setSettings({...settings, address: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="123 Kenyatta Avenue, Nairobi"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input 
            type="tel" 
            value={settings.phone}
            onChange={(e) => setSettings({...settings, phone: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="0712 345 678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">VAT / PIN Number</label>
          <input 
            type="text" 
            value={settings.vat_number}
            onChange={(e) => setSettings({...settings, vat_number: e.target.value})}
            className="w-full p-2 border rounded-lg"
            placeholder="P051234567X"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Receipt Footer Message</label>
          <textarea 
            value={settings.receipt_footer}
            onChange={(e) => setSettings({...settings, receipt_footer: e.target.value})}
            className="w-full p-2 border rounded-lg"
            rows={2}
            placeholder="Thank you for shopping with us!"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}