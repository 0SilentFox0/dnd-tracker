import { DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { findFlags } from "@/lib/utils/abilities/engine/collect-modifiers";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/participants";
import type { SpellTargeting as SpellTargetingDef } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

export interface SpellRef {
  id: string;
  groupId: string | null;
  level: number;
}

export interface SkillSpellTargeting {
  mode: "single" | "area" | "all";
  maxTargets: number;
}

export function spellTargetingFor(ps: BattleParticipant[], casterId: string, spell: SpellRef): SkillSpellTargeting {
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

export function validateSpellTargetCount(targeting: SkillSpellTargeting, count: number): boolean {
  return targeting.mode === "all" || count <= targeting.maxTargets;
}

export type SpellTargetResolution = { ok: true; targetIds: string[] } | { ok: false; error: string };

const fail = (error: string): SpellTargetResolution => ({ ok: false, error });

export function resolveSpellTargets(
  ps: BattleParticipant[],
  caster: BattleParticipant,
  spell: SpellRef,
  targeting: SpellTargetingDef,
  chosenIds: string[],
): SpellTargetResolution {
  const side = caster.basicInfo.side;

  const ids = (filter: (p: BattleParticipant) => boolean) => ps.filter(filter).map((p) => p.basicInfo.id);

  const chosen = [...new Set(chosenIds)].map((id) => findParticipant(ps, id));

  if (chosen.some((p) => !p)) return fail("Ціль заклинання відсутня в бою");

  const picked = chosen as BattleParticipant[];

  switch (targeting.kind) {
    case "self":
      return { ok: true, targetIds: [caster.basicInfo.id] };
    case "allAllies":
      return { ok: true, targetIds: ids((p) => isActive(p) && p.basicInfo.side === side) };
    case "allEnemies":
      return { ok: true, targetIds: ids((p) => isActive(p) && p.basicInfo.side !== side) };
    case "everyone":
      return { ok: true, targetIds: ids(isActive) };
    case "allyDead": {
      if (picked.length !== 1) return fail("Оберіть одного полеглого союзника");

      return picked[0].basicInfo.side === side && !isActive(picked[0]) ? { ok: true, targetIds: [picked[0].basicInfo.id] } : fail("Ціль має бути полеглим союзником");
    }
    case "ally":
    case "enemy":
    case "area": {
      const wanted = targeting.kind === "area" ? targeting.side : targeting.kind;

      if (picked.length === 0) return fail("Оберіть ціль заклинання");

      if (picked.some((p) => !isActive(p) || (p.basicInfo.side === side) !== (wanted === "ally"))) {
        return fail(wanted === "ally" ? "Ціль має бути живим союзником" : "Ціль має бути живим ворогом");
      }

      const skill = targeting.kind === "area" ? { mode: "single" as const, maxTargets: targeting.maxTargets } : spellTargetingFor(ps, caster.basicInfo.id, spell);

      const max = targeting.kind === "area" ? targeting.maxTargets : skill.maxTargets;

      if (targeting.kind === "area" ? picked.length > max : !validateSpellTargetCount(skill, picked.length)) return fail("Забагато цілей");

      const expanded = targeting.kind === "area" ? picked.map((p) => p.basicInfo.id) : expandSpellTargets(ps, caster.basicInfo.id, spell, picked.map((p) => p.basicInfo.id));

      return { ok: true, targetIds: expanded };
    }
  }
}
