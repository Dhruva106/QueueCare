import { NextResponse } from "next/server";
import { query, get } from "@/lib/db";
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  try {
    const stats = await getOrSetCache(
      CACHE_KEYS.STATS_SUMMARY,
      async () => {
        const totalPatientsRow = await get<{ count: number }>("SELECT count(*) as count FROM patient WHERE status = 'Active'");
        const totalAppointmentsRow = await get<{ count: number }>("SELECT count(*) as count FROM appointment WHERE appointment_date = CURDATE()");
        const waitingRow = await get<{ count: number }>("SELECT count(*) as count FROM queue_entry WHERE queue_date = CURDATE() AND queue_status = 'Waiting'");
        const inConsultationRow = await get<{ count: number }>("SELECT count(*) as count FROM queue_entry WHERE queue_date = CURDATE() AND queue_status = 'In-Consultation'");
        const completedTodayRow = await get<{ count: number }>("SELECT count(*) as count FROM queue_entry WHERE queue_date = CURDATE() AND queue_status = 'Completed'");
        const avgWaitRow = await get<{ avg_wait: number }>("SELECT COALESCE(AVG(estimated_wait_time), 0) as avg_wait FROM queue_entry WHERE queue_date = CURDATE() AND queue_status IN ('Waiting', 'Called')");

        // Queue distribution by department
        const deptDistribution = await query<{
          department_name: string;
          waiting_count: number;
        }>(`
          SELECT 
            d.department_name,
            COUNT(qe.queue_id) as waiting_count
          FROM department d
          LEFT JOIN doctor doc ON d.department_id = doc.department_id
          LEFT JOIN queue_entry qe ON doc.doctor_id = qe.doctor_id 
            AND qe.queue_date = CURDATE() 
            AND qe.queue_status IN ('Waiting', 'In-Consultation')
          GROUP BY d.department_id, d.department_name
          ORDER BY waiting_count DESC, d.department_name ASC
        `);

        // Normalize bar percentages
        const maxDeptCount = Math.max(1, ...deptDistribution.map((d) => d.waiting_count));
        const colors = ["bg-teal-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-indigo-500"];
        const formattedDeptCounts = deptDistribution.map((d, index) => ({
          name: d.department_name,
          count: d.waiting_count,
          widthPercent: Math.round((d.waiting_count / maxDeptCount) * 100),
          color: colors[index % colors.length],
        }));

        // Recent activity log from notifications
        const recentActivity = await query<{
          sent_time: string;
          message: string;
          notification_type: string;
        }>(`
          SELECT sent_time, message, notification_type
          FROM notification
          ORDER BY notification_id DESC
          LIMIT 6
        `);

        return {
          totalPatients: totalPatientsRow?.count || 0,
          appointmentsToday: totalAppointmentsRow?.count || 0,
          waitingPatients: waitingRow?.count || 0,
          inConsultation: inConsultationRow?.count || 0,
          completedToday: completedTodayRow?.count || 0,
          averageWaitTimeMinutes: Math.round(avgWaitRow?.avg_wait || 0),
          departmentQueueCounts: formattedDeptCounts,
          recentActivity: recentActivity.map((a) => ({
            time: a.sent_time,
            description: a.message,
            type: a.notification_type.toLowerCase().includes("queue") ? "queue" : "appointment",
          })),
        };
      },
      CACHE_TTL.SHORT // 30 seconds TTL for operational stats
    );

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
