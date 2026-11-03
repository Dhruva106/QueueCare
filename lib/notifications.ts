// =============================================================================
// QueueCare: Automated Notification Dispatcher
// Dispatches audit alerts and SMS/queue status notices to the notification entity
// =============================================================================

import { run } from "./db";

export interface CreateNotificationParams {
  patientId: number;
  appointmentId?: number | null;
  notificationType: 
    | "Appointment Confirmation" 
    | "Appointment Reminder" 
    | "Queue Update" 
    | "Doctor Delay" 
    | "Visit Summary" 
    | "Payment Reminder" 
    | "General";
  message: string;
}

export async function sendNotification(params: CreateNotificationParams): Promise<number> {
  const result = await run(
    `INSERT INTO notification (patient_id, appointment_id, notification_type, message, sent_time, notification_status)
     VALUES (?, ?, ?, ?, NOW(), 'Sent')`,
    [
      params.patientId,
      params.appointmentId ?? null,
      params.notificationType,
      params.message,
    ]
  );

  return result.lastInsertId;
}

