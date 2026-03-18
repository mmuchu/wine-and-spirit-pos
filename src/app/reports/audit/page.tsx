// src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { auditService } from "@/lib/services/auditService";
import { formatCurrency } from "@/components/pos/utils";
import { useOrganization } from "@/lib/context/OrganizationContext";

export default function AuditTrailPage() {
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
      const data = await auditService.getDailyReport(organizationId, date);
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('SALE')) return '💰';
    if (action.includes('STOCK')) return '📦';
    if (action.includes('EXPENSE')) return '💸';
    if (action.includes('SHIFT')) return '⏰';
    return '📝';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Daily Activity Log</h1>
          <p className="text-gray-500 text-sm mt-1">Audit trail of all business activities.</p>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading activities...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No activity recorded for this day.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                <div className="text-2xl">{getActionIcon(log.action)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-gray-800">{log.description}</p>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">{log.action}</span>
                    {log.metadata?.amount && <span>{formatCurrency(log.metadata.amount)}</span>}
                    {log.metadata?.quantity && <span>Qty: {log.metadata.quantity}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}