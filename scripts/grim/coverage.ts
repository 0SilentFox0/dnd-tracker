import type { GrimData, Row } from "./data";

import { CAREER_TIER_COUNT, careerTierKey } from "@/lib/constants/import-aliases";
import { coerceRecord, IMPORT_SPECS, nameKey } from "@/lib/utils/content/import";
import { mergeRules } from "@/lib/utils/rules/schema";
import { CHARACTERISTIC_KEYS } from "@/lib/utils/rules/systems";
import { parseStatus } from "@/lib/utils/rules/systems/wfrp/downtime/status";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

type Part = "characteristics" | "skills" | "talents";

const TIERS = Array.from({ length: CAREER_TIER_COUNT }, (_, i) => i + 1);

const nameOf = (row: Row) => (typeof row.name === "string" ? row.name.trim() : "");

const read = (row: Row): Row => coerceRecord(row, IMPORT_SPECS.careers.fields).value;

function list(record: Row, n: number, part: Part): string[] {
  const raw = record[careerTierKey(n, part)];

  return Array.isArray(raw) ? raw.map(String) : [];
}

const RANK = { brass: 0, silver: 1, gold: 2 } as const;

function statusRank(record: Row, n: number): number | null {
  const raw = record[careerTierKey(n, "status")];

  if (typeof raw !== "string" || raw.trim() === "") return null;

  const { tier, level } = parseStatus(raw);

  return RANK[tier] * 100 + level;
}

export function grimCoverage(data: GrimData): string[] {
  const warnings: string[] = [];

  const records = data.careers.map((career) => ({ career, record: read(career) }));

  const profiles = data.raceProfiles.map((p) => p.profile).filter((p) => p && typeof p === "object");

  if (profiles.length > 0) {
    const tabled = new Set(profiles.flatMap((p) => (p.careerTable ?? []).map((r) => nameKey(r.careerId))));

    for (const { career } of records) if (!tabled.has(nameKey(nameOf(career)))) warnings.push(`careers "${nameOf(career)}": not in any species careerTable`);
  }

  const used = new Set<string>();

  for (const { record } of records) for (const n of TIERS) list(record, n, "talents").forEach((t) => used.add(nameKey(t)));

  for (const p of profiles) {
    (p.talents ?? []).forEach((t) => used.add(nameKey(t)));
    (p.randomTalents ?? []).forEach((r) => used.add(nameKey(r.featId)));
  }

  for (const feat of data.feats) if (!used.has(nameKey(nameOf(feat)))) warnings.push(`feats "${nameOf(feat)}": unused`);

  if (data.careers.length > 0) {
    const advanced = new Set(records.flatMap(({ record }) => TIERS.flatMap((n) => list(record, n, "characteristics"))));

    for (const key of CHARACTERISTIC_KEYS) if (!advanced.has(key)) warnings.push(`characteristic "${key}": no career advances it`);
  }

  const merged = mergeRules(WFRP_RULES, (data.rules ?? {}) as Parameters<typeof mergeRules>[1]);

  const ticks = merged.ok ? merged.rules.advancement.career.ticksRequired[0] : undefined;

  for (const { career, record } of records) {
    const items = (["characteristics", "skills", "talents"] as const).reduce((sum, part) => sum + list(record, 1, part).length, 0);

    if (ticks !== undefined && items < ticks) warnings.push(`careers "${nameOf(career)}": tier 1 lists ${items} items, ticksRequired[0] is ${ticks}`);

    const ranks = TIERS.map((n) => statusRank(record, n));

    if (ranks.every((r) => r !== null) && ranks.some((r, i) => i > 0 && (r as number) <= (ranks[i - 1] as number))) warnings.push(`careers "${nameOf(career)}": tier statuses do not rise`);
  }

  data.raceProfiles.forEach(({ race, profile }) => {
    const fixed = new Set((profile.talents ?? []).map(nameKey));

    const distinct = new Set((profile.randomTalents ?? []).map((r) => nameKey(r.featId)).filter((t) => !fixed.has(t))).size;

    if (profile.randomTalentCount > distinct) warnings.push(`race-profiles "${race}": randomTalentCount ${profile.randomTalentCount} exceeds ${distinct} distinct table talents`);
  });

  return warnings;
}
