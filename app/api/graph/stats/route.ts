import { NextRequest, NextResponse } from "next/server";
import { getGraphMetrics, syncGraphFromDatabase } from "@/lib/graph";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const metrics = getGraphMetrics();
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
        { success: false, error: "Access denied. Only administrators can synchronize graph projections." },
        { status: 403 }
      );
    }

    const updated = await syncGraphFromDatabase();
    return NextResponse.json({
      success: true,
      message: "Graph synchronized from authoritative relational tables.",
      metrics: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

