import { NextRequest, NextResponse } from "next/server";
import { getDoctorRecommendations, getGraphMetrics, DoctorRecommendation } from "@/lib/graph";
import { getOrSetCache, CACHE_KEYS } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specialtyOrReason = searchParams.get("specialty") || searchParams.get("reason") || "";
    const preferredLocation = searchParams.get("location") || "";
    const maxFeeStr = searchParams.get("maxFee");
    const maxFee = maxFeeStr ? Number(maxFeeStr) : undefined;
    const urgencyLevel = searchParams.get("urgency") || "";

    const cacheKey = `${CACHE_KEYS.RECOMMENDATIONS_PREFIX}${encodeURIComponent(
      specialtyOrReason
    )}:${encodeURIComponent(preferredLocation)}:${maxFee || "all"}`;

    const recommendations = await getOrSetCache<DoctorRecommendation[]>(
      cacheKey,
      async () => {
        return getDoctorRecommendations({
          specialtyOrReason,
          preferredLocation,
          maxFee,
          urgencyLevel,
        });
      },
      120 // 2 minutes TTL
    );

    const graphMetrics = getGraphMetrics();

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
      graphEngine: graphMetrics.status,
      graphNodeCount: graphMetrics.nodeCount,
      graphRelCount: graphMetrics.relationshipCount,
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

