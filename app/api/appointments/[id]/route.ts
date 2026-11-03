import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { Appointment } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/auth";
import { cacheDel, CACHE_KEYS } from "@/lib/cache";
import { publishRealtimeEvent } from "@/lib/realtime";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointmentId = Number(id);

    if (isNaN(appointmentId)) {
      return NextResponse.json({ success: false, error: "Invalid appointment ID" }, { status: 400 });
    }

    const app = await get<Appointment & { patient_id: number; doctor_name: string }>(
      `SELECT a.*, p.patient_id, doc.doctor_name
       FROM appointment a
       JOIN patient p ON a.patient_id = p.patient_id
       JOIN doctor doc ON a.doctor_id = doc.doctor_id
       WHERE a.appointment_id = ?`,
      [appointmentId]
    );

    if (!app) {
      return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, appointment_date, appointment_time, remarks } = body;

    const user = getAuthenticatedUser(request);
    // Patient can only cancel or modify their own appointment
    if (user && user.role === "Patient" && user.linkedPatientId) {
      if (app.patient_id !== user.linkedPatientId) {
        return NextResponse.json(
          { success: false, error: "Access denied. Patients can only modify their own appointments." },
          { status: 403 }
        );
      }
    }

    if (action === "cancel") {
      await run(`UPDATE appointment SET appointment_status = 'Cancelled', remarks = COALESCE(?, remarks) WHERE appointment_id = ?`, [remarks, appointmentId]);
      await run(`UPDATE queue_entry SET queue_status = 'Cancelled', estimated_wait_time = 0 WHERE appointment_id = ?`, [appointmentId]);
      await cacheDel(CACHE_KEYS.STATS_SUMMARY);

      await sendNotification({
        patientId: app.patient_id,
        appointmentId,
        notificationType: "General",
        message: `Your appointment with Dr. ${app.doctor_name} has been cancelled.`,
      });

      publishRealtimeEvent("AppointmentCancelled", {
        appointment_id: appointmentId,
        patient_id: app.patient_id,
        doctor_id: app.doctor_id,
      }, { patientId: app.patient_id, doctorId: app.doctor_id });

      return NextResponse.json({ success: true, message: "Appointment cancelled successfully." });
    }

    if (action === "reschedule") {
      if (!appointment_date || !appointment_time) {
        return NextResponse.json({ success: false, error: "New date and time are required to reschedule." }, { status: 400 });
      }

      // Check conflict
      const conflict = await get<Appointment>(
        `SELECT appointment_id FROM appointment 
         WHERE doctor_id = ? 
           AND appointment_date = ? 
           AND appointment_time = ? 
           AND appointment_id <> ? 
           AND appointment_status NOT IN ('Cancelled')`,
        [app.doctor_id, appointment_date, appointment_time, appointmentId]
      );

      if (conflict) {
        return NextResponse.json(
          { success: false, error: `Dr. ${app.doctor_name} already has an appointment booked at that time.` },
          { status: 409 }
        );
      }

      await run(
        `UPDATE appointment 
         SET appointment_date = ?, appointment_time = ?, appointment_status = 'Rescheduled', remarks = COALESCE(?, remarks)
         WHERE appointment_id = ?`,
        [appointment_date, appointment_time, remarks, appointmentId]
      );

      await sendNotification({
        patientId: app.patient_id,
        appointmentId,
        notificationType: "Appointment Confirmation",
        message: `Your appointment with Dr. ${app.doctor_name} was rescheduled to ${appointment_date} at ${appointment_time}.`,
      });

      publishRealtimeEvent("AppointmentRescheduled", {
        appointment_id: appointmentId,
        patient_id: app.patient_id,
        doctor_id: app.doctor_id,
        appointment_date,
        appointment_time,
      }, { patientId: app.patient_id, doctorId: app.doctor_id });

      return NextResponse.json({ success: true, message: "Appointment rescheduled successfully." });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Use 'cancel' or 'reschedule'." }, { status: 400 });
  } catch (error) {
    console.error("Appointment patch error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

