import { DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/participants";
import { participantSpellAllowsMultipleTargets } from "@/lib/utils/battle/spell/participant-spell-target-mode";
import type { BattleParticipant } from "@/types/battle";

export interface SpellRef {
  id: string;
  groupId: string | null;
  level: number;
  type?: string;
}

export interface SpellTargeting {
  mode: "single" | "area" | "all";
  maxTargets: number;
}

export function spellTargetingFor(ps: BattleParticipant[], casterId: string, spell: SpellRef): SpellTargeting {
  if (spell.type === "aoe") return { mode: "single", maxTargets: 1 };

  const flags = findFlags(ps, casterId, "spellTargeting").filter(
    (f) =>
      (f.maxLevel === undefined || spell.level <= f.maxLevel) &&
      (!f.spellIds || f.spellIds.includes(spell.id)) &&
      (!f.school || f.school === spell.groupId),
  );

  if (flags.some((f) => f.mode === "all")) return { mode: "all", maxTargets: Infinity };

  const areas = flags.filter((f) => f.mode === "area");

  if (areas.length === 0) return { mode: "single", maxTargets: 1 };

  return { mode: "area", maxTargets: Math.max(...areas.map((f) => f.maxTargets ?? DEFAULT_AREA_TARGETS)) };
}

export function expandSpellTargets(ps: BattleParticipant[], casterId: string, spell: SpellRef, chosenIds: string[]): string[] {
  if (spellTargetingFor(ps, casterId, spell).mode !== "all") return chosenIds;

  const first = findParticipant(ps, chosenIds[0]);

  if (!first) return chosenIds;

  const side = ps.filter((p) => isActive(p) && p.basicInfo.side === first.basicInfo.side).map((p) => p.basicInfo.id);

  return [...new Set([...chosenIds, ...side])];
}

export function validateSpellTargetCount(targeting: SpellTargeting, count: number, spellType: string, legacyMulti = false): boolean {
  if (spellType === "aoe" || targeting.mode === "all" || legacyMulti) return true;

  return count <= targeting.maxTargets;
}

export function spellAllowsMultipleTargets(caster: BattleParticipant, ps: BattleParticipant[], spell: SpellRef): boolean {
  return participantSpellAllowsMultipleTargets(caster, spell.id) || spellTargetingFor(ps, caster.basicInfo.id, spell).mode !== "single";
}
