import { NextResponse } from "next/server";

import { readOnboardingFlags } from "@/lib/server/onboarding/flags";
import { requireAuth } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";
import { handleApiError } from "@/lib/utils/api/error-handler";

export async function GET() {
  try {
    const auth = await requireAuth();

    if (auth instanceof NextResponse) return auth;

    return NextResponse.json(await readOnboardingFlags(auth.userId), { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    return handleApiError(error, { action: "read onboarding flags" });
  }
}
