import { NextRequest, NextResponse } from "next/server";
import { query, run } from "@/lib/db";
import { Notification } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patient_id");

    let sql = `
      SELECT 
        n.*,
        p.first_name || ' ' || p.last_name as patient_name
      FROM notification n
      JOIN patient p ON n.patient_id = p.patient_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (patientId) {
      sql += ` AND n.patient_id = ?`;
      params.push(Number(patientId));
    }

    sql += ` ORDER BY n.notification_id DESC LIMIT 50`;

    const notifications = await query<Notification>(sql, params);
    return NextResponse.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notification_id } = body;

    if (notification_id) {
      await run("UPDATE notification SET notification_status = 'Read' WHERE notification_id = ?", [notification_id]);
    } else {
      await run("UPDATE notification SET notification_status = 'Read' WHERE notification_status = 'Sent'");
    }

    return NextResponse.json({ success: true, message: "Notifications marked as read." });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

