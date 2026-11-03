import { NextRequest, NextResponse } from "next/server";
import { query, run, get } from "@/lib/db";
import { Doctor } from "@/lib/types";
import { cacheDel, getOrSetCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { publishRealtimeEvent } from "@/lib/realtime";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("department_id");
    const includeInactive = searchParams.get("include_inactive") === "true";
    const search = searchParams.get("search")?.trim() || "";

    const cacheKey = `${CACHE_KEYS.DOCTORS_LIST}:${departmentId || "all"}:${includeInactive ? "all_status" : "active_only"}:${search || "none"}`;

    const doctors = await getOrSetCache<Doctor[]>(
      cacheKey,
      async () => {
        let sql = `
          SELECT 
            doc.*,
            dep.department_name,
            dep.location
          FROM doctor doc
          JOIN department dep ON doc.department_id = dep.department_id
          WHERE 1=1
        `;
        const params: unknown[] = [];

        if (!includeInactive) {
          sql += ` AND doc.status = 'Active'`;
        }

        if (departmentId) {
          sql += ` AND doc.department_id = ?`;
          params.push(Number(departmentId));
        }

        if (search) {
          sql += ` AND (doc.doctor_name LIKE ? OR doc.specialization LIKE ? OR dep.department_name LIKE ?)`;
          const pattern = `%${search}%`;
          params.push(pattern, pattern, pattern);
        }

        sql += ` ORDER BY doc.doctor_name ASC`;
        return query<Doctor>(sql, params);
      },
      CACHE_TTL.SHORT
    );

    return NextResponse.json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    console.error("Doctors GET error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request);
    // Role validation: Adding doctors is restricted to Administrators
    if (user && user.role !== "Administrator") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      doctor_name,
      department_id,
      specialization,
      qualification,
      phone,
      email,
      consultation_fee,
      working_days,
      working_hours_start,
      working_hours_end,
      slot_duration_minutes,
      room_number,
    } = body;

    if (!doctor_name || !department_id || !specialization) {
      return NextResponse.json(
        { success: false, error: "Doctor name, department, and specialization are required." },
        { status: 400 }
      );
    }

    // Check duplicate email if provided
    if (email) {
      const existing = await get<Doctor>("SELECT doctor_id FROM doctor WHERE email = ?", [email.trim()]);
      if (existing) {
        return NextResponse.json(
          { success: false, error: "A doctor with this email address already exists." },
          { status: 409 }
        );
      }
    }

    const result = await run(
      `INSERT INTO doctor (
        department_id, doctor_name, specialization, qualification, phone, email,
        availability_status, consultation_fee, status, working_days,
        working_hours_start, working_hours_end, slot_duration_minutes, room_number
      ) VALUES (?, ?, ?, ?, ?, ?, 'Available', ?, 'Active', ?, ?, ?, ?, ?)`,
      [
        Number(department_id),
        doctor_name.trim(),
        specialization.trim(),
        qualification ? qualification.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim().toLowerCase() : null,
        consultation_fee ? Number(consultation_fee) : 500.0,
        working_days || "Mon,Tue,Wed,Thu,Fri",
        working_hours_start || "09:00",
        working_hours_end || "17:00",
        slot_duration_minutes ? Number(slot_duration_minutes) : 15,
        room_number || "Room 101",
      ]
    );

    // Invalidate Redis caches
    await cacheDel("queuecare:doctors:*");
    await cacheDel("queuecare:rec:*");

    // Broadcast real-time event to all connected staff
    publishRealtimeEvent("DoctorCreated", {
      doctor_id: result.lastInsertId,
      doctor_name: doctor_name.trim(),
      department_id: Number(department_id),
      specialization: specialization.trim(),
    });

    return NextResponse.json({
      success: true,
      message: `Dr. ${doctor_name} successfully registered.`,
      doctorId: result.lastInsertId,
    });
  } catch (error) {
    console.error("Doctor POST error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request);
    const body = await request.json();
    const {
      doctor_id,
      doctor_name,
      department_id,
      specialization,
      qualification,
      phone,
      email,
      availability_status,
      consultation_fee,
      status,
      working_days,
      working_hours_start,
      working_hours_end,
      slot_duration_minutes,
      room_number,
    } = body;

    if (!doctor_id) {
      return NextResponse.json({ success: false, error: "doctor_id is required" }, { status: 400 });
    }

    // Role check: Only Admins can change status or profile; Doctors can toggle their own availability
    if (user && user.role !== "Administrator" && user.role !== "Doctor") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const result = await run(
      `UPDATE doctor 
       SET doctor_name = COALESCE(?, doctor_name),
           department_id = COALESCE(?, department_id),
           specialization = COALESCE(?, specialization),
           qualification = COALESCE(?, qualification),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           availability_status = COALESCE(?, availability_status),
           consultation_fee = COALESCE(?, consultation_fee),
           status = COALESCE(?, status),
           working_days = COALESCE(?, working_days),
           working_hours_start = COALESCE(?, working_hours_start),
           working_hours_end = COALESCE(?, working_hours_end),
           slot_duration_minutes = COALESCE(?, slot_duration_minutes),
           room_number = COALESCE(?, room_number)
       WHERE doctor_id = ?`,
      [
        doctor_name,
        department_id ? Number(department_id) : null,
        specialization,
        qualification,
        phone,
        email,
        availability_status,
        consultation_fee !== undefined ? Number(consultation_fee) : null,
        status,
        working_days,
        working_hours_start,
        working_hours_end,
        slot_duration_minutes ? Number(slot_duration_minutes) : null,
        room_number,
        doctor_id,
      ]
    );

    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: "Doctor not found or no changes made" }, { status: 404 });
    }

    // Invalidate Redis caches after mutation
    await cacheDel("queuecare:doctors:*");
    await cacheDel("queuecare:rec:*");

    // Broadcast real-time event
    publishRealtimeEvent("DoctorUpdated", {
      doctor_id,
      availability_status,
      status,
    });

    return NextResponse.json({ success: true, message: "Doctor profile updated successfully" });
  } catch (error) {
    console.error("Doctor update error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
