import { NextResponse } from "next/server";

import { isAiConfigured } from "@/lib/ai/crypto";
import { readDmSmartAvailability } from "@/lib/ai/dm-model";
import { guarded } from "@/lib/ai/guarded";
import { loadSummaries } from "@/lib/server/scenario/summary-store";
import { requireDM } from "@/lib/utils/api/api-auth";
import { PRIVATE_NO_STORE_HEADERS } from "@/lib/utils/api/cache-headers";

export const listSummariesHandler = (campaignId: string) =>
  guarded("list scenario summaries", () => requireDM(campaignId), async () =>
    NextResponse.json({ available: isAiConfigured() && (await readDmSmartAvailability(campaignId)), ...(await loadSummaries(campaignId)) }, { headers: PRIVATE_NO_STORE_HEADERS }),
  );
