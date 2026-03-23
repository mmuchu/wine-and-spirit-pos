 // src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { settingsService } from "@/lib/services/settingsService";

export default function SettingsPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mpesaPaybill, setMpesaPaybill] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatNumber, setVatNumber] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");

  useEffect(() => {
    if (organizationId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [organizationId]);

  const fetchSettings = async () => {
    // FIX: Add safety check for TypeScript
    if (!organizationId) return;

    setLoading(true);
    try {
      const data = await settingsService.getSettings(organizationId);
      if (data) {
        setShopName(data.shop_name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setMpesaPaybill(data.mpesa_paybill || "");
        setVatEnabled(data.vat_enabled ?? true);
        setVatNumber(data.vat_number || "");
        setReceiptFooter(data.receipt_footer || "");
      }
    } catch (err) {
      console.error("Error fetching settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      await settingsService.upsertSettings(organizationId, {
        shop_name: shopName,
        address: address,
        phone: phone,
        mpesa_paybill: mpesaPaybill,
        vat_enabled: vatEnabled,
        vat_number: vatNumber,
        receipt_footer: receiptFooter
      });
      alert("Settings saved successfully!");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (!organizationId) return <div className="p-8 text-center text-gray-500">Initializing...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your business profile.</p>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
        
        {/* Shop Details */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">Shop Details</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="Kenyan Spirit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="Nairobi, Kenya"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="0712 345 678"
            />
          </div>
        </div>

        {/* Payment & Tax */}
        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-lg border-b pb-2">Payment & Tax</h3>

          <div>
            <label className="block text-sm font-medium mb-1">M-Pesa Paybill / Till Number</label>
            <input
              type="text"
              value={mpesaPaybill}
              onChange={(e) => setMpesaPaybill(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="522522"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
             <div>
                <p className="font-medium text-sm">Enable VAT (16%)</p>
                <p className="text-xs text-gray-500">Add 16% tax to all sales</p>
             </div>
             <button
                onClick={() => setVatEnabled(!vatEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vatEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
             >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${vatEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">VAT Registration Number (Optional)</label>
            <input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              placeholder="P051234567X"
            />
          </div>
        </div>

        {/* Receipt */}
        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-lg border-b pb-2">Receipt Customization</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Footer Message</label>
            <textarea
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full p-3 border rounded-lg text-sm"
              rows={2}
              placeholder="Thank you for shopping with us!"
            />
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 disabled:bg-gray-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}