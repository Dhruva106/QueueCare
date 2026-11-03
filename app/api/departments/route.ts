import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { Department } from "@/lib/types";
import { getOrSetCache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export async function GET() {
  try {
    const departments = await getOrSetCache<(Department & { doctor_count: number })[]>(
      CACHE_KEYS.DEPARTMENTS,
      async () => {
        return query<Department & { doctor_count: number }>(`
          SELECT 
            d.*,
            COUNT(doc.doctor_id) as doctor_count
          FROM department d
          LEFT JOIN doctor doc ON d.department_id = doc.department_id AND doc.status = 'Active'
          WHERE d.status = 'Active'
          GROUP BY d.department_id, d.department_name
          ORDER BY d.department_name ASC
        `);
      },
      CACHE_TTL.LONG // 10 minutes TTL
    );

    return NextResponse.json({ success: true, count: departments.length, departments });
  } catch (error) {
    console.error("Departments GET error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
