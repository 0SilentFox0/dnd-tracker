import { DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { SKILL_ALL_RADIUS_FEET, SKILL_AREA_RADIUS_FEET } from "@/lib/constants/battle";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive } from "@/lib/utils/abilities/engine/core/participants";
import { footprintDistance, inBounds } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { aimInRange, feetToCells, templateAimAllowed, templateArea } from "@/lib/utils/battle/grid/template";
import type { SpellTargeting as SpellTargetingDef } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";

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

export interface SkillRadius {
  mode: "area" | "all";
  side: "ally" | "enemy";
  maxTargets: number;
}

export interface AimScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  caster: BattleParticipant;
}

export const skillRadiusTemplate = (mode: SkillRadius["mode"]): SpellTemplate => ({ shape: "circle", size: mode === "all" ? SKILL_ALL_RADIUS_FEET : SKILL_AREA_RADIUS_FEET });

/** Розширене вмінням одиночне заклинання не б'є своїх: лише сторона заклинання, найближчі до точки, до maxTargets. */
export function skillRadiusArea({ map, participants, caster }: AimScene, radius: SkillRadius, aim: GridPoint): { cells: string[]; targets: BattleParticipant[] } {
  const { cells, targets } = templateArea(map, participants, caster, skillRadiusTemplate(radius.mode), aim);

  const mine = caster.basicInfo.side;

  const sided = targets.filter((p) => (p.basicInfo.side === mine) === (radius.side === "ally"));

  return { cells, targets: sided.slice(0, radius.maxTargets) };
}

export function validateSpellTargetCount(targeting: SkillSpellTargeting, count: number): boolean {
  return targeting.mode === "all" || count <= targeting.maxTargets;
}

export type SpellTargetResolution = { ok: true; targetIds: string[]; cells?: string[] } | { ok: false; error: string };

export interface SpellMapContext {
  map: BattleMapConfig | null;
  targetCell?: GridPoint;
}

const fail = (error: string): SpellTargetResolution => ({ ok: false, error });

type TemplateTargeting = Extract<SpellTargetingDef, { kind: "template" }>;

function resolveTemplate(ps: BattleParticipant[], caster: BattleParticipant, targeting: TemplateTargeting, map: BattleMapConfig, aim: GridPoint | undefined): SpellTargetResolution {
  if (!aim) return fail("Оберіть точку на карті");

  if (!inBounds(map, aim)) return fail("Точка поза картою");

  if (!templateAimAllowed(cellsOf(caster), targeting, aim, targeting.range)) return fail("Точка поза дальністю заклинання");

  const { cells, targets } = templateArea(map, ps, caster, targeting, aim);

  const targetIds = targets.map((p) => p.basicInfo.id);

  if (cells.length === 0 || (targetIds.length === 0 && !targeting.zone)) return fail("У шаблоні немає цілей");

  return { ok: true, targetIds, cells };
}

function resolveSkillRadius(scene: AimScene, radius: SkillRadius, aim: { cell?: GridPoint; range?: number }): SpellTargetResolution {
  if (!aim.cell) return fail("Оберіть точку на карті");

  if (!inBounds(scene.map, aim.cell)) return fail("Точка поза картою");

  if (!aimInRange(cellsOf(scene.caster), aim.cell, aim.range)) return fail("Точка поза дальністю заклинання");

  const { cells, targets } = skillRadiusArea(scene, radius, aim.cell);

  if (targets.length === 0) return fail("У радіусі немає цілей");

  return { ok: true, targetIds: targets.map((p) => p.basicInfo.id), cells };
}

function outOfRange(caster: BattleParticipant, picked: BattleParticipant[], range: number | undefined): boolean {
  if (range === undefined) return false;

  const max = feetToCells(range);

  return picked.some((p) => p.battleData.position !== undefined && footprintDistance(cellsOf(caster), cellsOf(p)) > max);
}

export function resolveSpellTargets(
  ps: BattleParticipant[],
  caster: BattleParticipant,
  spell: SpellRef,
  targeting: SpellTargetingDef,
  chosenIds: string[],
  mapCtx?: SpellMapContext,
): SpellTargetResolution {
  const side = caster.basicInfo.side;

  const map = mapCtx?.map && isOnMap(caster) ? mapCtx.map : null;

  if (map && targeting.kind === "template") return resolveTemplate(ps, caster, targeting, map, mapCtx?.targetCell);

  if (map && (targeting.kind === "ally" || targeting.kind === "enemy")) {
    const skill = spellTargetingFor(ps, caster.basicInfo.id, spell);

    if (skill.mode !== "single") {
      return resolveSkillRadius({ map, participants: ps, caster }, { mode: skill.mode, side: targeting.kind, maxTargets: skill.maxTargets }, { cell: mapCtx?.targetCell, range: targeting.range });
    }
  }

  const ids = (filter: (p: BattleParticipant) => boolean) => ps.filter(filter).map((p) => p.basicInfo.id);

  const chosen = [...new Set(chosenIds)].map((id) => findParticipant(ps, id));

  if (chosen.some((p) => !p)) return fail("Ціль заклинання відсутня в бою");

  const picked = chosen as BattleParticipant[];

  if (map && "range" in targeting && outOfRange(caster, picked, targeting.range)) return fail("Ціль поза дальністю заклинання");

  switch (targeting.kind) {
    case "self":
      return { ok: true, targetIds: [caster.basicInfo.id] };
    case "allAllies":
      return { ok: true, targetIds: ids((p) => isActive(p) && p.basicInfo.side === side) };
    case "allEnemies":
      return { ok: true, targetIds: ids((p) => isActive(p) && p.basicInfo.side !== side) };
    case "everyone":
      return { ok: true, targetIds: ids(isActive) };
    case "allAlliesDead": {
      const fallen = ids((p) => !isActive(p) && p.basicInfo.side === side);

      return fallen.length > 0 ? { ok: true, targetIds: fallen } : fail("Немає полеглих союзників");
    }
    case "allyDead": {
      if (picked.length !== 1) return fail("Оберіть одного полеглого союзника");

      return picked[0].basicInfo.side === side && !isActive(picked[0]) ? { ok: true, targetIds: [picked[0].basicInfo.id] } : fail("Ціль має бути полеглим союзником");
    }
    case "ally":
    case "enemy":
    case "area":
    case "template": {
      const multi = targeting.kind === "area" || targeting.kind === "template";

      const wanted = multi ? targeting.side : targeting.kind;

      if (picked.length === 0) return fail("Оберіть ціль заклинання");

      if (picked.some((p) => !isActive(p) || (p.basicInfo.side === side) !== (wanted === "ally"))) {
        return fail(wanted === "ally" ? "Ціль має бути живим союзником" : "Ціль має бути живим ворогом");
      }

      const skill = multi ? { mode: "single" as const, maxTargets: targeting.maxTargets } : spellTargetingFor(ps, caster.basicInfo.id, spell);

      const max = multi ? targeting.maxTargets : skill.maxTargets;

      if (multi ? picked.length > max : !validateSpellTargetCount(skill, picked.length)) return fail("Забагато цілей");

      const expanded = multi ? picked.map((p) => p.basicInfo.id) : expandSpellTargets(ps, caster.basicInfo.id, spell, picked.map((p) => p.basicInfo.id));

      return { ok: true, targetIds: expanded };
    }
  }
}
