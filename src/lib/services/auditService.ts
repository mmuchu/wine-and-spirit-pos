 // src/lib/services/auditService.ts
import { createClient } from "@/lib/supabase/client";

export const auditService = {
  /**
   * Logs an action to the audit trail.
   * NON-BLOCKING (Fire and Forget):
   * We do NOT return a promise. This ensures the UI stays fast.
   */
  log(action: string, description: string, details: any = {}) {
    const supabase = createClient();
    
    // Get user info synchronously if possible, or fetch async
    supabase.auth.getUser().then(({ data: { user } }) => {
      
      // Perform the insert in the background
      supabase.from('audit_logs').insert({
        organization_id: details.organization_id || user?.user_metadata?.organization_id,
        user_id: user?.id,
        action: action,
        entity_type: details.entity_type || null,
        entity_id: details.entity_id || null,
        description: description,
        metadata: details.metadata || {}
      }).then(({ error }) => {
        if (error) {
          // Log error to console but don't crash the app
          console.error("Audit Log Failed:", error.message);
        }
      });

    }).catch(err => console.error("Auth error in audit:", err));
  },

  /**
   * Retrieves the daily report.
   * BLOCKING: We need this data to display the report.
   */
  async getDailyReport(organizationId: string, date: string) {
    const supabase = createClient();
    
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
      .order('created_at', { ascending: false })
      .limit(500); // Safety limit

    if (error) throw error;
    return data;
  }
};