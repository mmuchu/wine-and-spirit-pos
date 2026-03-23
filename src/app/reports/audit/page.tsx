 // src/app/reports/audit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/lib/context/OrganizationContext";
import { auditService } from "@/lib/services/auditService";
import { formatCurrency } from "@/components/pos/utils";

export default function AuditPage() {
  const { organizationId } = useOrganization();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) fetchActivities();
  }, [organizationId]);

  const fetchActivities = async () => {
    if (!organizationId) return;
    setLoading(true);
    const data = await auditService.getActivities(organizationId, 100);
    setActivities(data);
    setLoading(false);
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 text-green-700';
      case 'blue': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'orange': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'purple': return 'bg-purple-50 border-purple-200 text-purple-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (loading) return <div className="p-8">Loading Activity Stream...</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Activity Stream</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time feed of all business activities.</p>
        </div>
        <button onClick={fetchActivities} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="divide-y">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No activity yet.</div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="p-4 flex gap-4 hover:bg-gray-50 transition-colors">
                <div className="text-2xl">{act.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-baseline">
                    <p className="font-bold text-gray-800">{act.title}</p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(act.date).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{act.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getColorClasses(act.color)}`}>
                      {act.type}
                    </span>
                    <span className="text-xs text-gray-400">by {act.user}</span>
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