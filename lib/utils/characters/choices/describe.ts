import { type AbilityKey, isAbilityKey } from "@/lib/constants/abilities";
import { DND_SKILL_META } from "@/lib/constants/skills";
import type { FeatData, Picks, TextRef } from "@/types/choices";

export function describeFeatPicks(feat: Pick<FeatData, "choices">, picks: Picks): TextRef[] {
  return feat.choices.flatMap((choice) => {
    const list = picks[choice.id] ?? [];

    if (choice.kind === "abilityScore") {
      const counts = new Map<AbilityKey, number>();

      for (const p of list) if (isAbilityKey(p.id)) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);

      return [...counts].map(([ability, n]) => ({ message: "characterProfile.sheet.abilityPick", params: { n, ability } }));
    }

    if (choice.kind === "skill" || choice.kind === "expertise") return list.flatMap((p) => (p.id in DND_SKILL_META ? [{ message: `common.dndSkills.${p.id}` }] : []));

    if (choice.kind === "option") return list.flatMap((p) => choice.options?.find((o) => o.id === p.id)?.name ?? []).map((name) => ({ message: name }));

    return [];
  });
}
