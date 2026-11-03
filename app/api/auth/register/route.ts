import { NextRequest, NextResponse } from "next/server";
import { get, run, logAuditEvent } from "@/lib/db";
import { hashPassword, createSessionToken, AuthUser, UserRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role = "Patient", phone, date_of_birth, gender } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate
    const existing = await get("SELECT user_id FROM users WHERE email = ?", [cleanEmail]);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const { hash, salt } = hashPassword(password);
    let linkedPatientId: number | null = null;

    // If registering as Patient, create linked patient demographic record
    if (role === "Patient") {
      const names = name.trim().split(" ");
      const firstName = names[0];
      const lastName = names.slice(1).join(" ") || "Patient";

      const patientRes = await run(
        `INSERT INTO patient (first_name, last_name, date_of_birth, gender, phone, email, registration_date, status)
         VALUES (?, ?, ?, ?, ?, ?, CURDATE(), 'Active')`,
        [
          firstName,
          lastName,
          date_of_birth || "1995-01-01",
          gender || "Other",
          phone || null,
          cleanEmail,
        ]
      );
      linkedPatientId = patientRes.lastInsertId;
    }

    const userRes = await run(
      `INSERT INTO users (email, password_hash, salt, name, role, linked_patient_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [cleanEmail, hash, salt, name.trim(), role as UserRole, linkedPatientId]
    );

    const newUser: AuthUser = {
      id: userRes.lastInsertId,
      name: name.trim(),
      email: cleanEmail,
      role: role as UserRole,
      linkedPatientId,
    };

    const token = createSessionToken(newUser);
    await logAuditEvent(role, "USER_REGISTER", "USER", newUser.id, `New user registered as ${role}`);

    const response = NextResponse.json({
      success: true,
      message: "Registration successful.",
      user: newUser,
      token,
    });

    response.cookies.set("queuecare_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

