import { NextResponse } from "next/server";

import { cleanupAssistantData } from "@/lib/server/assistant/cleanup";
import { cleanupReadNotifications } from "@/lib/server/notifications/cleanup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return NextResponse.json({ error: "Scheduled cleanup is not configured" }, { status: 503 });

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupAssistantData();

    const notifications = await cleanupReadNotifications();

    return NextResponse.json({ ok: true, ...result, ...notifications });
  } catch {
    return NextResponse.json({ error: "Assistant cleanup failed" }, { status: 500 });
  }
}
