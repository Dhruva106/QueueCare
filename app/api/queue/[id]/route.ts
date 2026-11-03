import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { QueueEntry, Doctor } from "@/lib/types";
import { cacheDel, CACHE_KEYS } from "@/lib/cache";
import { publishRealtimeEvent } from "@/lib/realtime";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const queueId = Number(id);

    if (isNaN(queueId)) {
      return NextResponse.json({ success: false, error: "Invalid queue ID" }, { status: 400 });
    }

    const queueEntry = await get<QueueEntry & { patient_id: number; doctor_name: string }>(
      `SELECT qe.*, a.patient_id, doc.doctor_name
       FROM queue_entry qe
       JOIN appointment a ON qe.appointment_id = a.appointment_id
       JOIN doctor doc ON qe.doctor_id = doc.doctor_id
       WHERE qe.queue_id = ?`,
      [queueId]
    );

    if (!queueEntry) {
      return NextResponse.json({ success: false, error: "Queue entry not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, priority_level, priority_reason } = body;

    const nowTime = new Date().toTimeString().split(" ")[0];
    const today = new Date().toISOString().split("T")[0];

    let responseMessage = "";

    switch (action) {
      case "call": {
        await run("UPDATE queue_entry SET queue_status = 'Called' WHERE queue_id = ?", [queueId]);

        await sendNotification({
          patientId: queueEntry.patient_id,
          appointmentId: queueEntry.appointment_id,
          notificationType: "Queue Update",
          message: `Token #${queueEntry.token_number}: You have been CALLED for consultation with Dr. ${queueEntry.doctor_name}. Please proceed to the room.`,
        });

        responseMessage = `Token #${queueEntry.token_number} called.`;
        break;
      }

      case "start": {
        await run("UPDATE queue_entry SET queue_status = 'In-Consultation', estimated_wait_time = 0 WHERE queue_id = ?", [queueId]);
        await run("UPDATE appointment SET appointment_status = 'In-Progress' WHERE appointment_id = ?", [queueEntry.appointment_id]);

        // Ensure a visit record exists
        const existingVisit = await get("SELECT visit_id FROM visit WHERE appointment_id = ?", [queueEntry.appointment_id]);
        if (!existingVisit) {
          const doc = await get<Doctor>("SELECT consultation_fee FROM doctor WHERE doctor_id = ?", [queueEntry.doctor_id]);
          await run(
            `INSERT INTO visit (appointment_id, doctor_id, staff_id, visit_date, start_time, visit_status, billed_amount)
             VALUES (?, ?, ?, ?, ?, 'In Progress', ?)`,
            [
              queueEntry.appointment_id,
              queueEntry.doctor_id,
              4, // Default doctor assistant
              today,
              nowTime,
              doc?.consultation_fee || 500.0,
            ]
          );
        }

        responseMessage = "Consultation in progress.";
        break;
      }

      case "skip": {
        await run("UPDATE queue_entry SET queue_status = 'Skipped' WHERE queue_id = ?", [queueId]);
        responseMessage = `Token #${queueEntry.token_number} skipped.`;
        break;
      }

      case "no_show": {
        await run("UPDATE queue_entry SET queue_status = 'No-Show', estimated_wait_time = 0 WHERE queue_id = ?", [queueId]);
        await run("UPDATE appointment SET appointment_status = 'Cancelled', remarks = 'Marked No-Show by reception' WHERE appointment_id = ?", [queueEntry.appointment_id]);
        responseMessage = `Token #${queueEntry.token_number} marked as No-Show.`;
        break;
      }

      case "cancel": {
        await run("UPDATE queue_entry SET queue_status = 'Cancelled', estimated_wait_time = 0 WHERE queue_id = ?", [queueId]);
        await run("UPDATE appointment SET appointment_status = 'Cancelled' WHERE appointment_id = ?", [queueEntry.appointment_id]);
        responseMessage = `Token #${queueEntry.token_number} cancelled.`;
        break;
      }

      case "override_priority": {
        if (!priority_level) {
          return NextResponse.json({ success: false, error: "priority_level is required" }, { status: 400 });
        }

        await run(
          `UPDATE queue_entry 
           SET priority_level = ?, priority_reason = ? 
           WHERE queue_id = ?`,
          [priority_level, priority_reason || `Manual clinical override to ${priority_level}`, queueId]
        );

        responseMessage = "Priority updated successfully.";
        break;
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
    }

    // Invalidate cached stats
    await cacheDel(CACHE_KEYS.STATS_SUMMARY);

    // Broadcast real-time queue update event
    publishRealtimeEvent(
      action === "override_priority" ? "PriorityOverridden" : "QueueStatusChanged",
      {
        queue_id: queueId,
        action,
        token_number: queueEntry.token_number,
        doctor_id: queueEntry.doctor_id,
        patient_id: queueEntry.patient_id,
        priority_level,
      },
      { patientId: queueEntry.patient_id, doctorId: queueEntry.doctor_id }
    );

    return NextResponse.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error("Queue PATCH error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
