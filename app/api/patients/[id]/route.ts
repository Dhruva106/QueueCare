import { NextRequest, NextResponse } from "next/server";
import { get, query, run } from "@/lib/db";
import { Patient, Appointment, Visit } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = Number(id);

    if (isNaN(patientId)) {
      return NextResponse.json({ success: false, error: "Invalid patient ID" }, { status: 400 });
    }

    const patient = await get<Patient>(`SELECT * FROM patient WHERE patient_id = ?`, [patientId]);
    if (!patient) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }

    // Fetch appointment history
    const appointments = await query<Appointment>(
      `SELECT a.*, doc.doctor_name, dep.department_name, qe.token_number, qe.queue_status
       FROM appointment a
       JOIN doctor doc ON a.doctor_id = doc.doctor_id
       JOIN department dep ON a.department_id = dep.department_id
       LEFT JOIN queue_entry qe ON a.appointment_id = qe.appointment_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [patientId]
    );

    // Fetch clinical visit records
    const visits = await query<Visit>(
      `SELECT v.*, doc.doctor_name
       FROM visit v
       JOIN doctor doc ON v.doctor_id = doc.doctor_id
       JOIN appointment a ON v.appointment_id = a.appointment_id
       WHERE a.patient_id = ?
       ORDER BY v.visit_date DESC`,
      [patientId]
    );

    return NextResponse.json({
      success: true,
      patient,
      appointments,
      visits,
    });
  } catch (error) {
    console.error("Patient details error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patientId = Number(id);

    if (isNaN(patientId)) {
      return NextResponse.json({ success: false, error: "Invalid patient ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      phone,
      email,
      address,
      emergency_contact,
      status,
    } = body;

    const result = await run(
      `UPDATE patient
       SET first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           address = COALESCE(?, address),
           emergency_contact = COALESCE(?, emergency_contact),
           status = COALESCE(?, status)
       WHERE patient_id = ?`,
      [first_name, last_name, phone, email, address, emergency_contact, status, patientId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: "Patient not found or no changes" }, { status: 404 });
    }

    // Broadcast real-time event
    const { publishRealtimeEvent } = await import("@/lib/realtime");
    publishRealtimeEvent("PatientUpdated", {
      patient_id: patientId,
      first_name,
      last_name,
    }, { patientId });

    return NextResponse.json({ success: true, message: "Patient updated successfully" });
  } catch (error) {
    console.error("Patient update error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

