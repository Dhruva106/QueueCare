import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request);
    // If not authenticated or not staff, block access
    if (user && user.role === "Patient") {
      return NextResponse.json(
        { success: false, error: "Access denied. Patient accounts cannot access internal staff analytics." },
        { status: 403 }
      );
    }
    // 1. Priority Tier Aggregates (GROUP BY, AGGREGATE)
    const priorityStats = await query(`
      SELECT 
        priority_level,
        COUNT(*) as patient_count,
        ROUND(AVG(estimated_wait_time), 1) as avg_wait_time,
        MIN(estimated_wait_time) as min_wait_time,
        MAX(estimated_wait_time) as max_wait_time
      FROM queue_entry
      GROUP BY priority_level
      ORDER BY 
        CASE priority_level
          WHEN 'Emergency' THEN 1
          WHEN 'Urgent' THEN 2
          WHEN 'Senior Citizen' THEN 3
          WHEN 'Child/Infant' THEN 4
          ELSE 5
        END ASC
    `);

    // 2. Department Consultation & Revenue Summary
    const departmentStats = await query(`
      SELECT 
        d.department_name,
        d.location,
        COUNT(DISTINCT doc.doctor_id) as total_doctors,
        COUNT(v.visit_id) as completed_visits,
        COALESCE(SUM(v.billed_amount), 0.00) as total_revenue
      FROM department d
      JOIN doctor doc ON d.department_id = doc.department_id
      LEFT JOIN visit v ON doc.doctor_id = v.doctor_id AND v.visit_status = 'Completed'
      GROUP BY d.department_id, d.department_name, d.location
      ORDER BY total_revenue DESC
    `);

    // 3. Doctor Workload Analysis
    const doctorWorkload = await query(`
      SELECT 
        doc.doctor_id,
        doc.doctor_name,
        doc.specialization,
        dep.department_name,
        doc.availability_status,
        COUNT(a.appointment_id) as total_appointments,
        SUM(CASE WHEN qe.queue_status = 'Waiting' THEN 1 ELSE 0 END) as active_waiting,
        SUM(CASE WHEN qe.queue_status = 'Completed' THEN 1 ELSE 0 END) as completed_today
      FROM doctor doc
      JOIN department dep ON doc.department_id = dep.department_id
      LEFT JOIN appointment a ON doc.doctor_id = a.doctor_id AND a.appointment_date = CURDATE()
      LEFT JOIN queue_entry qe ON a.appointment_id = qe.appointment_id
      GROUP BY doc.doctor_id, doc.doctor_name, doc.specialization, dep.department_name, doc.availability_status
      ORDER BY active_waiting DESC, total_appointments DESC
    `);

    // 4. Hourly Distribution (Peak Intake Hours)
    const hourlyDistribution = await query(`
      SELECT 
        SUBSTR(check_in_time, 1, 2) as hour_of_day,
        COUNT(*) as checkins_count
      FROM queue_entry
      WHERE check_in_time IS NOT NULL
      GROUP BY SUBSTR(check_in_time, 1, 2)
      ORDER BY hour_of_day ASC
    `);

    // 5. Correlated subquery check: Doctors earning more than their department average fee
    const doctorsAboveDeptAvg = await query(`
      SELECT 
        outer_doc.doctor_name,
        outer_doc.specialization,
        outer_doc.consultation_fee,
        d.department_name
      FROM doctor outer_doc
      JOIN department d ON outer_doc.department_id = d.department_id
      WHERE outer_doc.consultation_fee >= (
        SELECT AVG(inner_doc.consultation_fee)
        FROM doctor inner_doc
        WHERE inner_doc.department_id = outer_doc.department_id
      )
    `);

    return NextResponse.json({
      success: true,
      reports: {
        priorityStats,
        departmentStats,
        doctorWorkload,
        hourlyDistribution,
        doctorsAboveDeptAvg,
      },
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

