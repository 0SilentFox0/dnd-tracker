import { NextResponse } from "next/server";

import { resetOnboardingSchema } from "@/lib/schemas";
import { resetOnboardingFlags } from "@/lib/server/onboarding/flags";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();

    if (auth instanceof NextResponse) return auth;

    const body = await parseBody(resetOnboardingSchema, request);

    if (body instanceof NextResponse) return body;

    await resetOnboardingFlags(auth.userId, body.scope);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "reset onboarding" });
  }
}
