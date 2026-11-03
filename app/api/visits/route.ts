import { NextRequest, NextResponse } from "next/server";
import { query, get, run } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { Visit, Appointment, Patient } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const doctorId = searchParams.get("doctor_id");

    let sql = `
      SELECT 
        v.*,
        p.first_name || ' ' || p.last_name as patient_name,
        doc.doctor_name
      FROM visit v
      JOIN appointment a ON v.appointment_id = a.appointment_id
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor doc ON v.doctor_id = doc.doctor_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (date) {
      sql += ` AND v.visit_date = ?`;
      params.push(date);
    }
    if (doctorId) {
      sql += ` AND v.doctor_id = ?`;
      params.push(Number(doctorId));
    }

    sql += ` ORDER BY v.visit_id DESC`;

    const visits = await query<Visit>(sql, params);
    return NextResponse.json({ success: true, count: visits.length, visits });
  } catch (error) {
    console.error("Visits GET error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      appointment_id,
      diagnosis,
      prescription,
      doctor_notes,
      billed_amount,
    } = body;

    if (!appointment_id) {
      return NextResponse.json({ success: false, error: "appointment_id is required." }, { status: 400 });
    }

    const app = await get<Appointment & Patient & { doctor_name: string }>(
      `SELECT a.*, p.patient_id, p.first_name, p.last_name, doc.doctor_name
       FROM appointment a
       JOIN patient p ON a.patient_id = p.patient_id
       JOIN doctor doc ON a.doctor_id = doc.doctor_id
       WHERE a.appointment_id = ?`,
      [appointment_id]
    );

    if (!app) {
      return NextResponse.json({ success: false, error: "Appointment not found." }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().split(" ")[0];

    // Check if visit record exists
    const existingVisit = await get<Visit>("SELECT * FROM visit WHERE appointment_id = ?", [appointment_id]);

    let visitId: number;

    if (existingVisit) {
      visitId = existingVisit.visit_id;
      await run(
        `UPDATE visit
         SET end_time = ?,
             diagnosis = COALESCE(?, diagnosis),
             prescription = COALESCE(?, prescription),
             doctor_notes = COALESCE(?, doctor_notes),
             billed_amount = COALESCE(?, billed_amount),
             visit_status = 'Completed'
         WHERE visit_id = ?`,
        [nowTime, diagnosis, prescription, doctor_notes, billed_amount, visitId]
      );
    } else {
      const result = await run(
        `INSERT INTO visit (
          appointment_id, doctor_id, staff_id, visit_date, 
          start_time, end_time, diagnosis, prescription, doctor_notes, 
          visit_status, billed_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?)`,
        [
          appointment_id,
          app.doctor_id,
          4, // Doctor assistant staff id
          today,
          nowTime,
          nowTime,
          diagnosis || "Routine consultation complete",
          prescription || "None",
          doctor_notes || null,
          billed_amount || 500.0,
        ]
      );
      visitId = result.lastInsertId;
    }

    // Mark Queue Entry Completed
    await run(
      `UPDATE queue_entry 
       SET queue_status = 'Completed', estimated_wait_time = 0 
       WHERE appointment_id = ?`,
      [appointment_id]
    );

    // Mark Appointment Completed
    await run(
      `UPDATE appointment 
       SET appointment_status = 'Completed' 
       WHERE appointment_id = ?`,
      [appointment_id]
    );

    // Send Visit Summary Notification
    await sendNotification({
      patientId: app.patient_id,
      appointmentId: appointment_id,
      notificationType: "Visit Summary",
      message: `Consultation with Dr. ${app.doctor_name} complete. Diagnosis: ${diagnosis || "Consultation recorded"}. Billing: INR ${billed_amount || 500}.`,
    });

    return NextResponse.json({
      success: true,
      visit_id: visitId,
      message: "Consultation and clinical notes saved successfully.",
    });
  } catch (error) {
    console.error("Visit completion error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
