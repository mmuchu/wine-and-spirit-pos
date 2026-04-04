 "use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { formatCurrency } from "@/components/pos/utils";
import { exportToCSV } from "@/lib/utils/export";

export default function SalesReportPage() {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (organizationId) fetchSales();
  }, [organizationId, date]);

  const fetchSales = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);

      // FIX: Changed from 'sales' to 'orders'
      const { data, error } = await supabase
        .from('orders')
        .select('id, created_at, total, payment_method, status')
        .eq('organization_id', organizationId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = sales.map(s => ({
      Time: new Date(s.created_at).toLocaleTimeString(),
      Total: s.total, // FIX: Changed from total_amount
      Method: s.payment_method,
      Status: s.status
    }));
    exportToCSV(data, `Sales_${date}`);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sales Report</h1>
          <p className="text-gray-500 text-sm mt-1">Transactions for {date}.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="border p-2 rounded"
          />
          <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">Export CSV</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="table-container overflow-x-auto">
          <table className="w-full text-sm sticky-header">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-semibold">Time</th>
                <th className="text-left p-3 font-semibold">Receipt #</th>
                <th className="text-center p-3 font-semibold">Method</th>
                <th className="text-center p-3 font-semibold">Status</th>
                <th className="text-right p-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No sales found.</td></tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="p-3">{new Date(sale.created_at).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono text-xs">{sale.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${sale.payment_method === 'mpesa' ? 'bg-green-50 text-green-700' : 'bg-gray-100'}`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                        {sale.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">{formatCurrency(sale.total)}</td>
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