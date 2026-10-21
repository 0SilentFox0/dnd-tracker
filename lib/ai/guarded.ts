import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/utils/api/error-handler";

export async function guarded<A>(action: string, guard: () => Promise<A | NextResponse>, run: (access: A) => Promise<Response>): Promise<Response> {
  try {
    const access = await guard();

    return access instanceof NextResponse ? access : await run(access);
  } catch (error) {
    return handleApiError(error, { action });
  }
}
