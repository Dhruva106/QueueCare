import { NextRequest, NextResponse } from "next/server";
import { get, logAuditEvent } from "@/lib/db";
import {
  verifyPassword,
  createSessionToken,
  AuthUser,
  UserRole,
  DEMO_USERS,
  DEMO_PERSONAS,
} from "@/lib/auth";

interface UserRow {
  user_id: number;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  role: UserRole;
  linked_patient_id: number | null;
  linked_doctor_id: number | null;
  linked_staff_id: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, demoRole, demoKey, patientId, doctorId } = body;

    let user: AuthUser | null = null;

    // 1. Dynamic sign-in as any registered patient (Generic Patient Portal)
    if (patientId) {
      const pRow = await get<{
        patient_id: number;
        first_name: string;
        last_name: string;
        email: string;
      }>("SELECT patient_id, first_name, last_name, email FROM patient WHERE patient_id = ?", [
        Number(patientId),
      ]);
      if (pRow) {
        user = {
          id: 1000 + pRow.patient_id,
          name: `${pRow.first_name} ${pRow.last_name}`,
          email: pRow.email || `patient${pRow.patient_id}@queuecare.hospital`,
          role: "Patient",
          linkedPatientId: pRow.patient_id,
        };
      }
    }

    // 1b. Dynamic sign-in as any registered doctor (Multi-Doctor Portal)
    const reqDocId = doctorId || (typeof demoKey === "string" && demoKey.startsWith("doctor:") ? Number(demoKey.split(":")[1]) : undefined);
    if (!user && reqDocId) {
      const did = Number(reqDocId);
      const doc = await get<{ doctor_id: number; doctor_name: string; email: string }>(
        "SELECT doctor_id, doctor_name, email FROM doctor WHERE doctor_id = ?",
        [did]
      );
      if (doc) {
        const uRow = await get<{ user_id: number }>("SELECT user_id FROM users WHERE linked_doctor_id = ? OR email = ?", [did, doc.email]);
        user = {
          id: uRow?.user_id || (2000 + did),
          name: doc.doctor_name,
          email: doc.email || `doctor${did}@queuecare.hospital`,
          role: "Doctor",
          linkedDoctorId: did,
        };
      }
    }

    // 2. Direct Demo Persona Selection (supports both team admins: Dhruva & Pramath, doctor, receptionist)
    if (!user && demoKey) {
      const persona = DEMO_PERSONAS.find((p) => p.key === demoKey);
      if (persona) {
        const row = await get<UserRow>("SELECT * FROM users WHERE email = ?", [persona.email]);
        if (row) {
          user = {
            id: row.user_id,
            name: row.name,
            email: row.email,
            role: row.role,
            linkedPatientId: row.linked_patient_id,
            linkedDoctorId: row.linked_doctor_id,
            linkedStaffId: row.linked_staff_id,
          };
        }
      }
    }

    // 3. Fallback for role-based switcher
    if (!user && demoRole && DEMO_USERS[demoRole as UserRole]) {
      const demoEmail = DEMO_USERS[demoRole as UserRole].email;
      const row = await get<UserRow>("SELECT * FROM users WHERE email = ?", [demoEmail]);

      if (row) {
        user = {
          id: row.user_id,
          name: row.name,
          email: row.email,
          role: row.role,
          linkedPatientId: row.linked_patient_id,
          linkedDoctorId: row.linked_doctor_id,
          linkedStaffId: row.linked_staff_id,
        };
      }
    }

    // 4. Standard credential authentication (independent credentials for both admins and all staff)
    if (!user) {
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: "Email and password are required." },
          { status: 400 }
        );
      }

      const row = await get<UserRow>("SELECT * FROM users WHERE LOWER(email) = ?", [
        email.trim().toLowerCase(),
      ]);

      if (!row) {
        return NextResponse.json(
          { success: false, error: "Invalid credentials." },
          { status: 401 }
        );
      }

      const isValid = verifyPassword(password, row.password_hash, row.salt);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid credentials." },
          { status: 401 }
        );
      }

      user = {
        id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        linkedPatientId: row.linked_patient_id,
        linkedDoctorId: row.linked_doctor_id,
        linkedStaffId: row.linked_staff_id,
      };
    }

    const token = createSessionToken(user);

    await logAuditEvent(user.role, "USER_LOGIN", "USER", user.id, `User logged in as ${user.role} (${user.name})`);

    const response = NextResponse.json({
      success: true,
      message: `Signed in as ${user.name} (${user.role})`,
      user,
      token,
    });

    // Set secure HTTP-only cookie
    response.cookies.set("queuecare_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
