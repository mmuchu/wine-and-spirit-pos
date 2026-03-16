// src/app/settings/page.tsx
"use client";

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-gray-500 mt-1">Manage your shop configuration.</p>

      <div className="mt-8 bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="font-semibold mb-4">Shop Details</h2>
        <p className="text-gray-600 text-sm">
          This area is reserved for future configurations like receipt headers, tax rates, and user management.
        </p>
      </div>
    </div>
  );
}