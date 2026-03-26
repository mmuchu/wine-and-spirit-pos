 // src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";

export default function AdminPortal() {
  const supabase = createClient();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [pass, setPass] = useState("");

  const ADMIN_PASSWORD = "AdminPass123"; // CHANGE THIS

  const handleLogin = () => {
    if (pass === ADMIN_PASSWORD) setLoggedIn(true);
    else alert("Wrong Password");
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data: settingsData, error } = await supabase
        .from('settings')
        .select('id, shop_name, license_expires_at, organization_id, website_url') // Added website_url
        .order('license_expires_at', { ascending: true });

      if (error) throw error;

      const clientsWithRevenue = await Promise.all((settingsData || []).map(async (client) => {
        const { data: sales } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('organization_id', client.organization_id);
        
        const revenue = sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
        return { ...client, revenue };
      }));

      setClients(clientsWithRevenue);
    } catch (err) {
      console.error(err);
      alert("Error loading data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) loadClients();
  }, [loggedIn]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center border">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
             <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
          <p className="text-sm text-gray-500 mb-6">Enter admin password to continue</p>
          <input 
            type="password" 
            value={pass} 
            onChange={e => setPass(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-center font-mono tracking-widest" 
            placeholder="••••••••"
          />
          <button onClick={handleLogin} className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors">
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  const activeCount = clients.filter(c => new Date(c.license_expires_at) > new Date()).length;
  const expiredCount = clients.length - activeCount;
  const totalRevenue = clients.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscriber Control Center</h1>
            <p className="text-gray-500 mt-1">Monitor clients and manage subscriptions.</p>
          </div>
          <button onClick={loadClients} className="text-sm bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 font-medium">
            Refresh Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Total Clients</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{clients.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Active</p>
            <p className="text-3xl font-extrabold text-green-600 mt-2">{activeCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Expired</p>
            <p className="text-3xl font-extrabold text-red-600 mt-2">{expiredCount}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Total Revenue</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-2">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        {/* Client Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-600">Shop Name</th>
                  <th className="text-left p-4 font-bold text-gray-600">Website</th>
                  <th className="text-left p-4 font-bold text-gray-600">Status</th>
                  <th className="text-left p-4 font-bold text-gray-600">Revenue</th>
                  <th className="text-left p-4 font-bold text-gray-600">Expires On</th>
                  <th className="text-right p-4 font-bold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading clients...</td></tr>
                ) : (
                  clients.map(client => {
                    const isExpired = new Date(client.license_expires_at) < new Date();
                    return (
                      <tr key={client.id} className={isExpired ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="p-4 font-bold text-gray-900">{client.shop_name || 'Unnamed Shop'}</td>
                        <td className="p-4 text-gray-500">
                          {client.website_url ? (
                            <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                              Visit <ExternalLinkIcon className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-300">No link</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {isExpired ? 'LOCKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-gray-700">{formatCurrency(client.revenue)}</td>
                        <td className="p-4 text-gray-500">
                          {new Date(client.license_expires_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => handleExtend(client.organization_id, 30)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition">+30 Days</button>
                          <button onClick={() => handleExtend(client.organization_id, 365)} className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition">+1 Year</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && clients.length === 0 && (
             <div className="p-12 text-center text-gray-400">No clients found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExternalLinkIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}