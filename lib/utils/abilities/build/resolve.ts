import type { Ability } from "@/lib/utils/abilities/schema";
import { inferLevelFromSkillName } from "@/lib/utils/battle/participant/parse";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";

const RANK: Record<string, number> = { basic: 1, advanced: 2, expert: 3 };

export function abilityKey(source: AbilitySource, abilityId: string): string {
  return `${source.type}:${source.id}:${abilityId}`;
}

export function resolveAbilities(source: AbilitySource, abilities: Ability[]): ResolvedAbility[] {
  return abilities.map((a) => ({ ...a, source, key: abilityKey(source, a.id) }));
}

function isLevelLine(source: AbilitySource): boolean {
  if (!source.line) return false;

  return source.line.levelNode ?? inferLevelFromSkillName(source.name) !== null;
}

// «Найвищий рівень у лінії»: рівні гілки групуються за mainSkillId, решта — за власним id; знімки до levelNode — за назвою.
export function pickHighestPerLine<T>(items: { item: T; source: AbilitySource }[]): { item: T; source: AbilitySource }[] {
  const byKey = new Map<string, { item: T; source: AbilitySource }>();

  for (const entry of items) {
    const line = entry.source.line;

    const key = line && isLevelLine(entry.source) ? `line:${line.mainSkillId}` : `skill:${entry.source.id}`;

    const existing = byKey.get(key);

    const rank = RANK[line?.level ?? "basic"] ?? 1;

    if (!existing || rank > (RANK[existing.source.line?.level ?? "basic"] ?? 1)) byKey.set(key, entry);
  }

  return [...byKey.values()];
}
