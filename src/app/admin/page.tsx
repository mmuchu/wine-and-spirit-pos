 // src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPortal() {
  const supabase = createClient();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pass, setPass] = useState("");

  // 1. Security (Simple Password)
  const handleLogin = () => {
    if (pass === "AdminPass123") setLoggedIn(true); // CHANGE THIS PASSWORD
    else alert("Wrong Password");
  };

  // 2. Load all shops (settings table)
  const loadClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('settings')
      .select('id, shop_name, license_expires_at, organization_id')
      .order('license_expires_at', { ascending: true });
    
    if (data) setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    if (loggedIn) loadClients();
  }, [loggedIn]);

  // 3. Extend Subscription (The "Unlock" Button)
  const handleExtend = async (orgId: string, days: number) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    
    await supabase
      .from('settings')
      .update({ license_expires_at: newDate.toISOString() })
      .eq('organization_id', orgId);
      
    alert(`Extended! New date: ${newDate.toLocaleDateString()}`);
    loadClients();
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="bg-white p-8 rounded-lg shadow-xl w-96 text-center">
          <h1 className="text-xl font-bold mb-4">Super Admin Login</h1>
          <input 
            type="password" 
            value={pass} 
            onChange={e => setPass(e.target.value)}
            className="w-full p-2 border rounded mb-4" 
            placeholder="Enter Admin Password"
          />
          <button onClick={handleLogin} className="w-full bg-black text-white py-2 rounded font-bold">Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Subscriber Control Center</h1>
          <button onClick={loadClients} className="text-sm bg-white px-4 py-2 rounded shadow hover:bg-gray-50">Refresh</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <p className="text-gray-500 text-xs">Total Shops</p>
            <p className="text-2xl font-bold">{clients.length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-gray-500 text-xs">Active (Paid)</p>
            <p className="text-2xl font-bold text-green-600">{clients.filter(c => new Date(c.license_expires_at) > new Date()).length}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <p className="text-gray-500 text-xs">Expired (Locked)</p>
            <p className="text-2xl font-bold text-red-600">{clients.filter(c => new Date(c.license_expires_at) <= new Date()).length}</p>
          </div>
        </div>

        {/* Client List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold">Shop Name</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Expires On</th>
                <th className="text-right p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>
              ) : (
                clients.map(client => {
                  const isExpired = new Date(client.license_expires_at) < new Date();
                  return (
                    <tr key={client.id} className={isExpired ? 'bg-red-50' : ''}>
                      <td className="p-4 font-bold">{client.shop_name || 'New Shop'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {isExpired ? 'LOCKED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(client.license_expires_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button onClick={() => handleExtend(client.organization_id, 30)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">+30 Days</button>
                        <button onClick={() => handleExtend(client.organization_id, 365)} className="px-3 py-1 bg-black text-white rounded text-xs font-bold hover:bg-gray-800">+1 Year</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}