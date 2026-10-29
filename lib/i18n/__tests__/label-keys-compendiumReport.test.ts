import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import type { SpellBlocker } from "@/lib/server/compendium-import/adapters/spell-derive";

const SOURCE_ROOT = join(process.cwd(), "lib/server/compendium-import");

const FILES = ["dependencies", "service", "plan", "feature-resolution", "entries", "adapters/shared", "adapters/content", "adapters/characters", "adapters/race-traits", "adapters/equipment", "adapters/feat-prerequisites", "adapters/feat-spells", "adapt/state", "adapt/subraces", "adapt/books", "adapt/top-level", "adapt/optional-features"];

const BLOCKERS: SpellBlocker[] = ["SUMMON", "BUFF_OR_TRANSFORM", "WEAPON", "VARIABLE_DAMAGE", "SELF_DAMAGE", "ZONE_OR_TRIGGER", "UNSUPPORTED_CONDITION", "UNMODELED_EFFECT"];

const codes = new Set<string>(["default", "SOURCE_REQUIRED", "NAME_REQUIRED", ...BLOCKERS.map((b) => `MANUAL_SPELL_${b}`)]);

for (const file of FILES) {
  for (const match of readFileSync(join(SOURCE_ROOT, `${file}.ts`), "utf8").matchAll(/issue\("([A-Z_]+)"/g)) codes.add(match[1]);
}

describe("compendiumReport label keys", () => {
  expectLabelKeys("compendiumReport", "issues", [...codes]);
});
