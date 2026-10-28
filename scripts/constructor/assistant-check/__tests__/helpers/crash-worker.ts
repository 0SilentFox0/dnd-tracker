import { PrismaClient } from "@prisma/client";

import { createSyntheticCampaign } from "@/fixtures/campaign.synthetic";
import { manifestTracker } from "@/scripts/constructor/assistant-check/manifest";

const db = new PrismaClient({ log: [] });

void createSyntheticCampaign(db, process.env.CRASH_WORKER_RUN_ID ?? "", manifestTracker()).then(() => {
  process.stdout.write("READY\n");
  setInterval(() => undefined, 1_000);
});
