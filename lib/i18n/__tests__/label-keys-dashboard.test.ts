import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { BattleStatus } from "@/lib/constants/battle";
import { DM_DASHBOARD_SECTIONS, PLAYER_DASHBOARD_SECTIONS } from "@/lib/constants/campaign-dashboard";

const SECTION_KEYS = [...new Set([...DM_DASHBOARD_SECTIONS, ...PLAYER_DASHBOARD_SECTIONS].map((s) => s.key))];

const GROUPS = [...new Set([...DM_DASHBOARD_SECTIONS, ...PLAYER_DASHBOARD_SECTIONS].map((s) => s.group))];

describe("dashboard label registries have translations", () => {
  expectLabelKeys("dashboard", "groups", GROUPS);
  expectLabelKeys("dashboard", "battleStatus", Object.values(BattleStatus));

  for (const field of ["title", "subtitle", "keywords"]) expectLabelKeys("dashboard", "sections", SECTION_KEYS.map((k) => `${k}.${field}`));
});
