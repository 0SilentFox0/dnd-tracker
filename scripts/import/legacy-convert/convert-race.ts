import type { ConversionIssue, ConversionResult, ConvertOptions } from "./types";

import type { Effect } from "@/lib/utils/abilities/schema";
import { isRecord } from "@/lib/utils/common/is-record";


const TARGET_KEYS = [
  ["min_targets", "minTargets"],
  ["minTargets", "minTargets"],
  ["max_targets", "maxTargets"],
  ["maxTargets", "maxTargets"],
] as const;

export function convertLegacyRace(row: { id: string; name: string; passiveAbility: unknown }, opts: ConvertOptions = {}): ConversionResult {
  const issues: ConversionIssue[] = [];

  const pa = isRecord(row.passiveAbility) ? row.passiveAbility : {};

  const effects: Effect[] = [];

  if (!opts.skipBakedStats) {
    for (const [key, stat] of TARGET_KEYS) {
      const v = pa[key];

      if (typeof v === "number" && v !== 0) effects.push({ kind: "modifyStat", stat, flat: v });
    }
  }

  const text = [pa.description, pa.statImprovements].filter((x) => typeof x === "string").join(" ");

  if (/імун|опір|immun|resist/i.test(text)) {
    issues.push({ severity: "loss", message: `Раса «${row.name}»: опис згадує опір/імунітет — задайте прапорець resistance вручну` });
  }

  return { abilities: effects.length ? [{ id: "race", name: row.name, trigger: { event: "passive" }, effects }] : [], issues };
}
