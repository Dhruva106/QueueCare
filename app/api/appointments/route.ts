import { NextRequest, NextResponse } from "next/server";
import { query, get, run } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { Appointment, Doctor } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const doctorId = searchParams.get("doctor_id");
    const status = searchParams.get("status");

    let sql = `
      SELECT 
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        p.date_of_birth as patient_dob,
        doc.doctor_name,
        dep.department_name,
        qe.token_number,
        qe.queue_status,
        qe.priority_level
      FROM appointment a
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor doc ON a.doctor_id = doc.doctor_id
      JOIN department dep ON a.department_id = dep.department_id
      LEFT JOIN queue_entry qe ON a.appointment_id = qe.appointment_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (date) {
      sql += ` AND a.appointment_date = ?`;
      params.push(date);
    }
    if (doctorId) {
      sql += ` AND a.doctor_id = ?`;
      params.push(Number(doctorId));
    }
    if (status) {
      sql += ` AND a.appointment_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY a.appointment_date DESC, a.appointment_time ASC`;

    const appointments = await query<Appointment>(sql, params);
    return NextResponse.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    console.error("Appointments GET error:", error);
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
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      reason_for_visit,
      appointment_type,
      remarks,
    } = body;

    // Validation
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { success: false, error: "Patient, Doctor, Date, and Time are mandatory." },
        { status: 400 }
      );
    }

    // Verify doctor and retrieve department_id
    const doctor = await get<Doctor>("SELECT doctor_id, department_id, doctor_name FROM doctor WHERE doctor_id = ?", [doctor_id]);
    if (!doctor) {
      return NextResponse.json({ success: false, error: "Selected doctor does not exist." }, { status: 404 });
    }

    // Check for scheduling conflict: doctor double booking
    const conflict = await get<Appointment>(
      `SELECT appointment_id FROM appointment 
       WHERE doctor_id = ? 
         AND appointment_date = ? 
         AND appointment_time = ? 
         AND appointment_status NOT IN ('Cancelled')`,
      [doctor_id, appointment_date, appointment_time]
    );

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error: `Dr. ${doctor.doctor_name} is already booked for ${appointment_time} on ${appointment_date}. Please choose another time slot.`,
        },
        { status: 409 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const result = await run(
      `INSERT INTO appointment (
        patient_id, doctor_id, department_id, appointment_date, 
        appointment_time, booking_date, reason_for_visit, appointment_type, 
        appointment_status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?)`,
      [
        patient_id,
        doctor_id,
        doctor.department_id,
        appointment_date,
        appointment_time,
        today,
        reason_for_visit || null,
        appointment_type || "OPD",
        remarks || null,
      ]
    );

    // Send confirmation alert
    await sendNotification({
      patientId: Number(patient_id),
      appointmentId: result.lastInsertId,
      notificationType: "Appointment Confirmation",
      message: `Appointment confirmed with Dr. ${doctor.doctor_name} on ${appointment_date} at ${appointment_time}.`,
    });

    // Invalidate Redis cached aggregates and doctor recommendation caches
    const { cacheDel } = await import("@/lib/cache");
    await cacheDel("queuecare:stats:*");
    await cacheDel("queuecare:rec:*");

    // Broadcast real-time event to update operational calendars and schedules
    const { publishRealtimeEvent } = await import("@/lib/realtime");
    publishRealtimeEvent("AppointmentBooked", {
      appointment_id: result.lastInsertId,
      patient_id: Number(patient_id),
      doctor_id: Number(doctor_id),
      appointment_date,
      appointment_time,
    }, { patientId: Number(patient_id), doctorId: Number(doctor_id) });

    return NextResponse.json({
      success: true,
      appointment_id: result.lastInsertId,
      message: "Appointment booked successfully.",
    });
  } catch (error) {
    console.error("Appointment booking error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

