import { NextRequest, NextResponse } from "next/server";
import { getCacheMetrics, flushQueueCareCache } from "@/lib/cache";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const metrics = await getCacheMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || user.role !== "Administrator") {
      return NextResponse.json(
        { success: false, error: "Access denied. Only administrators can flush system cache." },
        { status: 403 }
      );
    }

    const cleared = await flushQueueCareCache();
    return NextResponse.json({
      success: true,
      message: `Cache invalidated successfully (${cleared} keys cleared).`,
      clearedKeys: cleared,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

