import { NextRequest, NextResponse } from "next/server";
import { resetDatabase } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || user.role !== "Administrator") {
      return NextResponse.json(
        { success: false, error: "Access denied. Administrator privileges required." },
        { status: 403 }
      );
    }

    resetDatabase();
    return NextResponse.json({ success: true, message: "Database re-seeded successfully." });
  } catch (error) {
    console.error("Database reset error:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
