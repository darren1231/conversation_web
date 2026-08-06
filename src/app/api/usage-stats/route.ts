import { NextRequest, NextResponse } from "next/server";
import { getUsageStats } from "@/lib/actions/api-credentials";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "all";

    if (!["day", "month", "all"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be 'day', 'month', or 'all'" },
        { status: 400 }
      );
    }

    const stats = await getUsageStats(period as "day" | "month" | "all");

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Usage stats error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch usage stats",
      },
      { status: 500 }
    );
  }
}
