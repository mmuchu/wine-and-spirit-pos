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
      // 1. Get all organizations settings
      const { data: settingsData, error } = await supabase
        .from('settings')
        .select('id, shop_name, license_expires_at, organization_id, website_url')
        .order('license_expires_at', { ascending: true });

      if (error) throw error;

      // 2. Calculate Revenue for each client
      const clientsWithRevenue = await Promise.all((settingsData || []).map(async (client: any) => {
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

  const handleLifetime = async (orgId: string) => {
    if(!confirm("Grant LIFETIME access?")) return;
    
    await supabase
      .from('settings')
      .update({ license_expires_at: null }) // NULL = Forever
      .eq('organization_id', orgId);
      
    alert("Lifetime Access Granted!");
    loadClients();
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
             <span className="text-white text-4xl font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-sm text-gray-300 mb-6">Enter password to manage clients</p>
          <input 
            type="password" 
            value={pass} 
            onChange={e => setPass(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg mb-4 text-center font-mono text-white tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            placeholder="••••••••"
          />
          <button onClick={handleLogin} className="w-full bg-white text-gray-900 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors">
            Enter
          </button>
        </div>
      </div>
    );
  }

  const activeCount = clients.filter(c => !c.license_expires_at || new Date(c.license_expires_at) > new Date()).length;
  const expiredCount = clients.length - activeCount;
  const totalRevenue = clients.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Control Center</h1>
            <p className="text-gray-500 mt-1">Manage subscribers and licenses.</p>
          </div>
          <button onClick={loadClients} className="text-sm bg-white border px-4 py-2 rounded-lg hover:bg-gray-50 font-medium shadow-sm">
            Refresh Data
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Clients</p>
              <p className="text-2xl font-extrabold text-gray-900">{clients.length}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Active</p>
              <p className="text-2xl font-extrabold text-emerald-600">{activeCount}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
              <LockIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Expired</p>
              <p className="text-2xl font-extrabold text-red-600">{expiredCount}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <DollarIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Revenue</p>
              <p className="text-xl font-extrabold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-bold text-gray-600">Shop Name</th>
                  <th className="text-left p-4 font-bold text-gray-600">Status</th>
                  <th className="text-left p-4 font-bold text-gray-600">Revenue</th>
                  <th className="text-left p-4 font-bold text-gray-600">Expires On</th>
                  <th className="text-right p-4 font-bold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading...</td></tr>
                ) : (
                  clients.map(client => {
                    const isExpired = client.license_expires_at && new Date(client.license_expires_at) < new Date();
                    const isLifetime = !client.license_expires_at;
                    
                    return (
                      <tr key={client.id} className={`hover:bg-gray-50 transition-colors ${isExpired ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                        <td className="p-4">
                          <p className="font-bold text-gray-800">{client.shop_name || 'Unnamed Shop'}</p>
                          {client.website_url && <a href={client.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">{client.website_url}</a>}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            isLifetime ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                            isExpired ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}>
                            {isLifetime ? 'LIFETIME' : isExpired ? 'LOCKED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-gray-600">{formatCurrency(client.revenue)}</td>
                        <td className="p-4 text-gray-500">
                          {isLifetime ? <span className="text-purple-600 font-semibold">Forever</span> : new Date(client.license_expires_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => handleExtend(client.organization_id, 30)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm">+30 Days</button>
                          <button onClick={() => handleExtend(client.organization_id, 365)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-gray-900 transition shadow-sm">+1 Year</button>
                          <button onClick={() => handleLifetime(client.organization_id)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition shadow-sm">Lifetime</button>
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
    </div>
  );
}

// Simple Icons
function UserIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 0 14.998 0A17.933 17.933 0 0 0 12 15.75c-2.992 0-5.769.622-8.154 1.718" /></svg>); }
function CheckIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>); }
function LockIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>); }
function DollarIcon(props: any) { return (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>); }