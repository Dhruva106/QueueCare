import { NextRequest, NextResponse } from "next/server";
import { query, get, run } from "@/lib/db";
import { evaluateTriage, compareQueueEntries, calculateWaitTimeMinutes } from "@/lib/prioritization";
import { sendNotification } from "@/lib/notifications";
import { QueueEntry, Appointment, Patient, PriorityLevel } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const doctorId = searchParams.get("doctor_id");
    const departmentId = searchParams.get("department_id");

    let sql = `
      SELECT 
        qe.*,
        p.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.phone as patient_phone,
        p.date_of_birth as patient_dob,
        p.gender as patient_gender,
        doc.doctor_name,
        dep.department_name,
        a.reason_for_visit,
        a.appointment_time
      FROM queue_entry qe
      JOIN appointment a ON qe.appointment_id = a.appointment_id
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor doc ON qe.doctor_id = doc.doctor_id
      JOIN department dep ON doc.department_id = dep.department_id
      WHERE qe.queue_date = ?
    `;
    const params: unknown[] = [date];

    if (doctorId) {
      sql += ` AND qe.doctor_id = ?`;
      params.push(Number(doctorId));
    }
    if (departmentId) {
      sql += ` AND dep.department_id = ?`;
      params.push(Number(departmentId));
    }

    const rawEntries = await query<QueueEntry>(sql, params);

    // Sort entries according to prioritization rules
    const sortedEntries = [...rawEntries].sort(compareQueueEntries);

    // Group by doctor to compute dynamic wait times for waiting entries
    const doctorWaitingMap = new Map<number, number>();
    const enrichedEntries = sortedEntries.map((entry) => {
      if (entry.queue_status === "Waiting") {
        const countAhead = doctorWaitingMap.get(entry.doctor_id) || 0;
        const estWait = calculateWaitTimeMinutes(countAhead, entry.priority_level);
        doctorWaitingMap.set(entry.doctor_id, countAhead + 1);
        return { ...entry, estimated_wait_time: estWait };
      }
      return entry;
    });

    return NextResponse.json({
      success: true,
      count: enrichedEntries.length,
      queue: enrichedEntries,
    });
  } catch (error) {
    console.error("Queue GET error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appointment_id, explicit_priority, explicit_reason } = body;

    if (!appointment_id) {
      return NextResponse.json({ success: false, error: "appointment_id is required" }, { status: 400 });
    }

    // Check if appointment exists
    const app = await get<Appointment & Patient & { doctor_name: string }>(
      `SELECT a.*, p.date_of_birth, p.first_name, p.last_name, doc.doctor_name
       FROM appointment a
       JOIN patient p ON a.patient_id = p.patient_id
       JOIN doctor doc ON a.doctor_id = doc.doctor_id
       WHERE a.appointment_id = ?`,
      [appointment_id]
    );

    if (!app) {
      return NextResponse.json({ success: false, error: "Appointment not found." }, { status: 404 });
    }

    // Idempotent Check: Check if already checked in
    const existingQueue = await get<QueueEntry>("SELECT * FROM queue_entry WHERE appointment_id = ?", [appointment_id]);
    if (existingQueue) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        message: `Patient is already in the queue with Token #${existingQueue.token_number} (Status: ${existingQueue.queue_status}).`,
        token_number: existingQueue.token_number,
        estimated_wait_time: existingQueue.estimated_wait_time,
        queue_entry: existingQueue,
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().split(" ")[0];

    // Evaluate Triage Priority
    const triage = evaluateTriage({
      dateOfBirth: app.date_of_birth,
      reasonForVisit: app.reason_for_visit || undefined,
      appointmentType: app.appointment_type,
      explicitPriority: explicit_priority as PriorityLevel,
      explicitReason: explicit_reason,
    });

    // Determine sequential token number for this doctor on this day
    const tokenRow = await get<{ max_token: number }>(
      "SELECT MAX(token_number) as max_token FROM queue_entry WHERE doctor_id = ? AND queue_date = ?",
      [app.doctor_id, today]
    );
    const baseToken = (app.doctor_id * 100) + 1;
    const nextToken = tokenRow?.max_token ? tokenRow.max_token + 1 : baseToken;

    // Count existing waiting patients ahead
    const aheadRow = await get<{ count: number }>(
      "SELECT count(*) as count FROM queue_entry WHERE doctor_id = ? AND queue_date = ? AND queue_status IN ('Waiting', 'Called')",
      [app.doctor_id, today]
    );
    const waitingAhead = aheadRow?.count || 0;
    const estWait = calculateWaitTimeMinutes(waitingAhead, triage.priorityLevel);

    const result = await run(
      `INSERT INTO queue_entry (
        appointment_id, doctor_id, token_number, queue_date, 
        check_in_time, estimated_wait_time, priority_level, priority_reason, queue_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Waiting')`,
      [
        appointment_id,
        app.doctor_id,
        nextToken,
        today,
        nowTime,
        estWait,
        triage.priorityLevel,
        triage.priorityReason,
      ]
    );

    // Update appointment status to Checked-In
    await run("UPDATE appointment SET appointment_status = 'Checked-In' WHERE appointment_id = ?", [appointment_id]);

    // Send automated notification
    await sendNotification({
      patientId: app.patient_id,
      appointmentId: appointment_id,
      notificationType: "Queue Update",
      message: `Token #${nextToken} generated for Dr. ${app.doctor_name}. Priority: ${triage.priorityLevel}. Est wait: ${estWait} mins.`,
    });

    // Invalidate dashboard stats cache
    const { cacheDel, CACHE_KEYS } = await import("@/lib/cache");
    await cacheDel(CACHE_KEYS.STATS_SUMMARY);

    // Broadcast real-time check-in event to staff & patient views
    const { publishRealtimeEvent } = await import("@/lib/realtime");
    publishRealtimeEvent("PatientCheckedIn", {
      queue_id: result.lastInsertId,
      token_number: nextToken,
      doctor_id: app.doctor_id,
      patient_id: app.patient_id,
      priority_level: triage.priorityLevel,
    }, { patientId: app.patient_id, doctorId: app.doctor_id });

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      queue_id: result.lastInsertId,
      token_number: nextToken,
      priority_level: triage.priorityLevel,
      estimated_wait_time: estWait,
      message: "Checked in successfully.",
    });
  } catch (error) {
    console.error("Queue check-in error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
