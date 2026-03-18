import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export interface GroupedHeroEffect {
  sourceName: string;
  sourceAvatar?: string | null;
  effectNames: string[];
  durations: string[];
  hasBuff: boolean;
  hasDebuff: boolean;
}

/**
 * Групує активні ефекти: ті, що від героїв (за назвою джерела) — в groupedHeroEffects,
 * решту — в regularEffects.
 */
export function groupEffectsBySource(
  activeEffects: ActiveEffect[],
  initiativeOrder: BattleParticipant[],
): {
  groupedHeroEffects: GroupedHeroEffect[];
  regularEffects: ActiveEffect[];
} {
  const sourceByName = new Map(
    initiativeOrder.map((p) => [p.basicInfo.name, p]),
  );

  const grouped = new Map<
    string,
    {
      sourceName: string;
      sourceAvatar?: string | null;
      effectNames: string[];
      durations: string[];
      hasBuff: boolean;
      hasDebuff: boolean;
    }
  >();

  const regular: ActiveEffect[] = [];

  for (const effect of activeEffects) {
    const sourceName = effect.name.split(" — ")[0]?.trim();
    const source = sourceName ? sourceByName.get(sourceName) : undefined;

    if (source) {
      const existing = grouped.get(source.basicInfo.id);
      const durationText =
        effect.duration != null ? `${effect.duration} раундів` : "";

      if (existing) {
        existing.effectNames.push(effect.name);
        if (durationText) existing.durations.push(durationText);
        existing.hasBuff ||= effect.type === "buff";
        existing.hasDebuff ||= effect.type === "debuff";
      } else {
        grouped.set(source.basicInfo.id, {
          sourceName: source.basicInfo.name,
          sourceAvatar: source.basicInfo.avatar,
          effectNames: [effect.name],
          durations: durationText ? [durationText] : [],
          hasBuff: effect.type === "buff",
          hasDebuff: effect.type === "debuff",
        });
      }
      continue;
    }

    regular.push(effect);
  }

  return {
    groupedHeroEffects: Array.from(grouped.values()),
    regularEffects: regular,
  };
}
