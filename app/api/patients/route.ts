import { NextRequest, NextResponse } from "next/server";
import { query, run, get } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { Patient } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    let sql = `SELECT * FROM patient WHERE status = 'Active'`;
    const params: unknown[] = [];

    if (search) {
      sql += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }

    sql += ` ORDER BY patient_id DESC`;

    const patients = await query<Patient>(sql, params);
    return NextResponse.json({ success: true, count: patients.length, patients });
  } catch (error) {
    console.error("Patients GET error:", error);
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
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      address,
      emergency_contact,
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !date_of_birth) {
      return NextResponse.json(
        { success: false, error: "First name, last name, and date of birth are required." },
        { status: 400 }
      );
    }

    // Check duplicate phone or email if provided
    if (phone) {
      const existingPhone = await get<Patient>("SELECT patient_id FROM patient WHERE phone = ?", [phone]);
      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: "A patient with this phone number is already registered." },
          { status: 409 }
        );
      }
    }

    if (email) {
      const existingEmail = await get<Patient>("SELECT patient_id FROM patient WHERE email = ?", [email]);
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "A patient with this email address is already registered." },
          { status: 409 }
        );
      }
    }

    const today = new Date().toISOString().split("T")[0];

    const result = await run(
      `INSERT INTO patient (first_name, last_name, date_of_birth, gender, phone, email, address, emergency_contact, registration_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [
        first_name.trim(),
        last_name.trim(),
        date_of_birth,
        gender || "Other",
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        address ? address.trim() : null,
        emergency_contact ? emergency_contact.trim() : null,
        today,
      ]
    );

    // Send registration welcome notification
    await sendNotification({
      patientId: result.lastInsertId,
      notificationType: "General",
      message: `Welcome to QueueCare, ${first_name}! Your Patient ID is #QC-${result.lastInsertId}.`,
    });

    // Broadcast real-time event
    const { publishRealtimeEvent } = await import("@/lib/realtime");
    publishRealtimeEvent("PatientCreated", {
      patient_id: result.lastInsertId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
    });

    const { cacheDel, CACHE_KEYS } = await import("@/lib/cache");
    await cacheDel(CACHE_KEYS.STATS_SUMMARY);

    return NextResponse.json({
      success: true,
      patient_id: result.lastInsertId,
      message: "Patient registered successfully.",
    });
  } catch (error) {
    console.error("Patient registration error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

