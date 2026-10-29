import { expect, it } from "vitest";

import { convertSpells } from "../convert/spells";
import { FIXTURE_DIR, loadOpen5e } from "../lib/open5e";

const KEYS = ["slug", "targeting", "resolution", "dice", "dieSides", "upcastDice", "upcastTargets", "addAbilityMod", "spellEffects"] as const;

it("SRD spell derivation is unchanged by importer work", async () => {
  const rows = convertSpells(loadOpen5e(FIXTURE_DIR)).map((s) => Object.fromEntries(KEYS.map((k) => [k, (s as unknown as Record<string, unknown>)[k] ?? null])));

  await expect(JSON.stringify(rows, null, 2)).toMatchFileSnapshot("./__file_snapshots__/spells-derive.json");
});
