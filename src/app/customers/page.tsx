 // src/app/customers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function CustomersPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (organizationId) fetchCustomers();
  }, [organizationId]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (loading) return <div className="p-8">Loading Clients...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-gray-500 text-sm mt-1">Identify and manage your customers</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <input 
          type="text" 
          placeholder="Search by Name or Phone..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-2 border rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold">Client Name</th>
              <th className="text-left p-4 font-semibold">Phone</th>
              <th className="text-left p-4 font-semibold">Location</th>
              <th className="text-right p-4 font-semibold">Outstanding Balance</th>
              <th className="text-center p-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No clients found.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{c.name}</td>
                  <td className="p-4 text-gray-500">{c.phone || '-'}</td>
                  <td className="p-4 text-gray-500">{c.address || '-'}</td>
                  <td className="p-4 text-right font-bold text-red-600">
                    {formatCurrency(c.balance || 0)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${(c.balance || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {(c.balance || 0) > 0 ? 'OWING' : 'CLEAR'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}