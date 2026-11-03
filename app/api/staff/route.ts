import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Staff } from "@/lib/types";

export async function GET() {
  try {
    const staffMembers = await query<Staff>("SELECT * FROM staff WHERE staff_status = 'Active' ORDER BY staff_id ASC");
    return NextResponse.json({ success: true, count: staffMembers.length, staff: staffMembers });
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

