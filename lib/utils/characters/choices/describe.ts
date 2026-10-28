import { ABILITY_SHORT_LABELS, type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import { DND_SKILL_META, type DndSkill } from "@/lib/constants/skills";
import type { FeatData, Picks } from "@/types/choices";

export function describeFeatPicks(feat: FeatData, picks: Picks): string[] {
  return feat.choices.flatMap((choice) => {
    const list = picks[choice.id] ?? [];

    if (choice.kind === "abilityScore") {
      const counts = new Map<AbilityKey, number>();

      for (const p of list) if (isAbilityKey(p.id)) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);

      return [...counts].map(([ability, n]) => `+${n} ${ABILITY_SHORT_LABELS[ability]}`);
    }

    if (choice.kind === "skill" || choice.kind === "expertise") return list.flatMap((p) => (p.id in DND_SKILL_META ? [DND_SKILL_META[p.id as DndSkill].label] : []));

    if (choice.kind === "option") return list.flatMap((p) => choice.options?.find((o) => o.id === p.id)?.name ?? []);

    return [];
  });
}
