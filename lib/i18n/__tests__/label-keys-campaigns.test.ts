import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { CampaignRole } from "@/lib/constants/campaigns";
import { SYNC_SCOPES, SYNC_STATUSES } from "@/lib/constants/source-sync";

describe("campaigns label registries have translations", () => {
  expectLabelKeys("campaigns", "roles", Object.values(CampaignRole));
  expectLabelKeys("campaigns", "sourceSync.scope", SYNC_SCOPES);
  expectLabelKeys("campaigns", "sourceSync.status", [...SYNC_STATUSES, "deletedInTemplate"]);
  expectLabelKeys("campaigns", "sourceSync.title", ["fromSource", "fromTemplate"]);
});
