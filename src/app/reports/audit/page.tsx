 // src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";

export default function DailyAuditPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (organizationId) fetchLogs();
  }, [organizationId, date]);

  const fetchLogs = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Daily Audit Log</h1>
          <p className="text-gray-500 text-sm mt-1">System activity for {date}.</p>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="border p-2 rounded"
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Apply table-container and overflow-x-auto */}
        <div className="table-container overflow-x-auto">
          <table className="w-full text-sm sticky-header">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Time</th>
                <th className="text-left p-3 font-semibold">User</th>
                <th className="text-left p-3 font-semibold">Action</th>
                <th className="text-left p-3 font-semibold">Description</th>
                <th className="text-left p-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No activity recorded.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</td>
                    <td className="p-3">{log.user_id ? log.user_id.slice(0, 8) : 'System'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-100">{log.action}</span>
                    </td>
                    <td className="p-3">{log.description}</td>
                    <td className="p-3 text-gray-400 text-xs">{JSON.stringify(log.metadata || {}).slice(0, 30)}...</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}