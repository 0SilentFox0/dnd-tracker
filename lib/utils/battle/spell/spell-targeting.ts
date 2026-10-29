import { DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { SKILL_AREA_RADIUS_FEET } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, isAirborne, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import type { FlagEffect } from "@/lib/utils/abilities/schema";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { conditionSourceIds } from "@/lib/utils/battle/conditions/query";
import { isDying } from "@/lib/utils/battle/death-saves";
import { footprintDistance, inBounds } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { aimInRange, feetToCells, templateAimAllowed, templateArea, templateCentre } from "@/lib/utils/battle/grid/template";
import { modeAimHiddenText, modeSightedTargets, modeTargetHiddenText } from "@/lib/utils/battle/modes/engine";
import { isReserved } from "@/lib/utils/battle/participant/reserve";
import { upcastSteps } from "@/lib/utils/battle/spell/caster-dice";
import type { SpellTargeting as SpellTargetingDef } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface SpellRef {
  id: string;
  groupId: string | null;
  level: number;
}

export interface SkillSpellTargeting {
  mode: "single" | "area" | "all";
  maxTargets: number;
}

type TargetingFlag = Extract<FlagEffect, { flag: "spellTargeting" }>;

const fitsSpell = (f: TargetingFlag, spell: SpellRef) =>
  (f.maxLevel === undefined || spell.level <= f.maxLevel) && (!f.spellIds || f.spellIds.includes(spell.id)) && (!f.school || f.school === spell.groupId);

/** Найсильніше розширення заклинання разом із назвою вміння/артефакту, що його дало. */
export function spellWideningOf(ps: BattleParticipant[], casterId: string, spell: SpellRef): SkillSpellTargeting & { source?: LogLine } {
  const found = collectModifiers(ps, casterId, { flag: "spellTargeting" }).entries.flatMap((e) =>
    e.flag?.flag === "spellTargeting" && fitsSpell(e.flag, spell) ? [{ flag: e.flag, source: e.source ?? e.label }] : [],
  );

  const all = found.find((f) => f.flag.mode === "all");

  if (all) return { mode: "all", maxTargets: Infinity, source: all.source };

  const areas = found.map((f) => ({ maxTargets: f.flag.maxTargets ?? DEFAULT_AREA_TARGETS, source: f.source }));

  if (areas.length === 0) return { mode: "single", maxTargets: 1 };

  const best = areas.reduce((a, b) => (b.maxTargets > a.maxTargets ? b : a));

  return { mode: "area", ...best };
}

export function spellTargetingFor(ps: BattleParticipant[], casterId: string, spell: SpellRef): SkillSpellTargeting {
  const { mode, maxTargets } = spellWideningOf(ps, casterId, spell);

  return { mode, maxTargets };
}

/** Режим «all»: уся сторона заклинання на полі — без вибору, наведення й дальності, з картою чи без. */
export function skillAllTargets(ps: BattleParticipant[], caster: BattleParticipant, side: "ally" | "enemy"): string[] {
  const mine = caster.basicInfo.side;

  return ps.filter((p) => isTargetable(p) && !isReserved(p) && (p.basicInfo.side === mine) === (side === "ally")).map((p) => p.basicInfo.id);
}

export interface SkillRadius {
  side: "ally" | "enemy";
  maxTargets: number;
}

export interface AimScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  caster: BattleParticipant;
}

export const SKILL_AREA_TEMPLATE: SpellTemplate = { shape: "circle", size: SKILL_AREA_RADIUS_FEET };

/** Розширене вмінням одиночне заклинання не б'є своїх: лише сторона заклинання, найближчі до точки, до maxTargets. */
export function skillRadiusArea({ map, participants, caster }: AimScene, radius: SkillRadius, aim: GridPoint): { cells: string[]; targets: BattleParticipant[] } {
  const { cells, targets } = templateArea(map, participants, caster, SKILL_AREA_TEMPLATE, aim);

  const mine = caster.basicInfo.side;

  const sided = targets.filter((p) => (p.basicInfo.side === mine) === (radius.side === "ally"));

  return { cells, targets: sided.slice(0, radius.maxTargets) };
}

export interface SpellChain {
  side: "ally" | "enemy";
  maxTargets: number;
}

/** Ланцюг на карті: кожна наступна ціль — найближча до попередньої жива на карті зі сторони заклинання; рівні — за ініціативою. */
export function spellChain({ participants, caster }: Omit<AimScene, "map">, chain: SpellChain, first: BattleParticipant): BattleParticipant[] {
  const mine = caster.basicInfo.side;

  const pool = participants.filter((p) => p !== first && isActive(p) && isOnMap(p) && (p.basicInfo.side === mine) === (chain.side === "ally"));

  const out = [first];

  while (out.length < chain.maxTargets && pool.length > 0 && isOnMap(out[out.length - 1])) {
    const from = cellsOf(out[out.length - 1]);

    const next = pool.reduce((best, p) => (footprintDistance(from, cellsOf(p)) < footprintDistance(from, cellsOf(best)) ? p : best));

    out.push(next);
    pool.splice(pool.indexOf(next), 1);
  }

  return out;
}

export function validateSpellTargetCount(targeting: SkillSpellTargeting, count: number): boolean {
  return targeting.mode === "all" || count <= targeting.maxTargets;
}

export type SpellTargetResolution = { ok: true; targetIds: string[]; cells?: string[]; centre?: GridPoint } | { ok: false; error: LogLine };

export interface SpellMapContext {
  map: BattleMapConfig | null;
  targetCell?: GridPoint;
  castLevel?: number;
  upcastTargets?: number;
}

const SIGHTED_KINDS: ReadonlySet<SpellTargetingDef["kind"]> = new Set(["ally", "enemy", "allyDead", "area", "template"]);

const fail = (error: LogLine): SpellTargetResolution => ({ ok: false, error });

type TemplateTargeting = Extract<SpellTargetingDef, { kind: "template" }>;

function resolveTemplate(ps: BattleParticipant[], caster: BattleParticipant, targeting: TemplateTargeting, map: BattleMapConfig, aim: GridPoint | undefined): SpellTargetResolution {
  if (targeting.shape === "emanation") {
    const centre = cellsOf(caster)[0];

    const { cells, targets } = templateArea(map, ps, caster, targeting, centre);

    return { ok: true, targetIds: targets.map((p) => p.basicInfo.id), cells, centre };
  }

  if (!aim) return fail(textRef("battleActions.spell.target.pickPoint"));

  if (!inBounds(map, aim)) return fail(textRef("battleActions.spell.target.pointOutOfMap"));

  if (!templateAimAllowed(cellsOf(caster), targeting, aim, targeting.range)) return fail(textRef("battleActions.spell.target.pointOutOfRange"));

  const hidden = modeAimHiddenText(map, caster, aim);

  if (hidden) return fail(hidden);

  const { cells, targets } = templateArea(map, ps, caster, targeting, aim);

  // конус/лінія у власну клітинку не мають напрямку — інакше слот згорів би без зони

  if (cells.length === 0) return fail(textRef("battleActions.spell.target.pickDirection"));

  // промах повз усіх — теж каст: слот і дія витрачаються, FX летить у точку

  return { ok: true, targetIds: targets.map((p) => p.basicInfo.id), cells, centre: templateCentre(targeting, aim, cells) };
}

function resolveSkillRadius(scene: AimScene, radius: SkillRadius, aim: { cell?: GridPoint; range?: number }): SpellTargetResolution {
  if (!aim.cell) return fail(textRef("battleActions.spell.target.pickPoint"));

  if (!inBounds(scene.map, aim.cell)) return fail(textRef("battleActions.spell.target.pointOutOfMap"));

  if (!aimInRange(cellsOf(scene.caster), aim.cell, aim.range)) return fail(textRef("battleActions.spell.target.pointOutOfRange"));

  const hidden = modeAimHiddenText(scene.map, scene.caster, aim.cell);

  if (hidden) return fail(hidden);

  const { cells, targets } = skillRadiusArea(scene, radius, aim.cell);

  return { ok: true, targetIds: targets.map((p) => p.basicInfo.id), cells, centre: aim.cell };
}

function outOfRange(caster: BattleParticipant, picked: BattleParticipant[], range: number | undefined): boolean {
  if (range === undefined) return false;

  const max = feetToCells(range);

  return picked.some((p) => p.battleData.position !== undefined && footprintDistance(cellsOf(caster), cellsOf(p)) > max);
}

function resolveRaw(
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

  if (targeting.kind === "ally" || targeting.kind === "enemy") {
    const skill = spellTargetingFor(ps, caster.basicInfo.id, spell);

    if (skill.mode === "all") {
      const all = modeSightedTargets(map, ps, caster, skillAllTargets(ps, caster, targeting.kind));

      return all.length > 0 ? { ok: true, targetIds: all } : fail(textRef("battleActions.spell.target.noTargets"));
    }

    if (map && skill.mode === "area") {
      return resolveSkillRadius({ map, participants: ps, caster }, { side: targeting.kind, maxTargets: skill.maxTargets }, { cell: mapCtx?.targetCell, range: targeting.range });
    }
  }

  const ids = (filter: (p: BattleParticipant) => boolean) => ps.filter(filter).map((p) => p.basicInfo.id);

  const chosen = [...new Set(chosenIds)].map((id) => findParticipant(ps, id));

  if (chosen.some((p) => !p)) return fail(textRef("battleActions.spell.target.targetMissing"));

  const picked = chosen as BattleParticipant[];

  if (picked.some(isAirborne)) return fail(textRef(API_ERRORS.TARGET_AIRBORNE));

  if (map && "range" in targeting && outOfRange(caster, picked, targeting.range)) return fail(textRef("battleActions.spell.target.targetOutOfRange"));

  const targetHidden = map && SIGHTED_KINDS.has(targeting.kind) ? modeTargetHiddenText(map, caster, picked) : null;

  if (targetHidden) return fail(targetHidden);

  const sighted = (filter: (p: BattleParticipant) => boolean) => modeSightedTargets(map, ps, caster, ids(filter));

  switch (targeting.kind) {
    case "self":

      return { ok: true, targetIds: [caster.basicInfo.id] };
    case "allAllies":

      return { ok: true, targetIds: ids((p) => isTargetable(p) && p.basicInfo.side === side) };
    case "allEnemies":

      return { ok: true, targetIds: sighted((p) => isTargetable(p) && p.basicInfo.side !== side) };
    case "everyone":

      return { ok: true, targetIds: sighted(isTargetable) };
    case "allAlliesDead": {
      const fallen = ids((p) => !isActive(p) && p.basicInfo.side === side);

      return fallen.length > 0 ? { ok: true, targetIds: fallen } : fail(textRef("battleActions.spell.target.noFallen"));
    }
    case "allyDead": {
      if (picked.length !== 1) return fail(textRef("battleActions.spell.target.pickOneFallen"));

      return picked[0].basicInfo.side === side && !isActive(picked[0]) ? { ok: true, targetIds: [picked[0].basicInfo.id] } : fail(textRef("battleActions.spell.target.mustBeFallen"));
    }
    case "ally":
    case "enemy":
    case "area":
    case "template": {
      const multi = targeting.kind === "area" || targeting.kind === "template";

      const wanted = multi ? targeting.side : targeting.kind;

      if (picked.length === 0) return fail(textRef("battleActions.spell.target.pickTarget"));

      if (picked.some((p) => !(isActive(p) || (wanted === "ally" && isDying(p))) || (p.basicInfo.side === side) !== (wanted === "ally"))) {
        return fail(textRef(wanted === "ally" ? "battleActions.spell.target.mustBeAlly" : "battleActions.spell.target.mustBeEnemy"));
      }

      if (map && targeting.kind === "area" && targeting.chain) {
        if (picked.length !== 1) return fail(textRef("battleActions.spell.target.pickChainFirst"));

        return { ok: true, targetIds: spellChain({ participants: ps, caster }, targeting, picked[0]).map((p) => p.basicInfo.id) };
      }

      const base = multi ? { mode: "single" as const, maxTargets: targeting.maxTargets } : spellTargetingFor(ps, caster.basicInfo.id, spell);

      const skill = multi ? base : { ...base, maxTargets: base.maxTargets + upcastExtra(caster, spell, mapCtx) };

      if (!validateSpellTargetCount(skill, picked.length)) return fail(textRef("battleActions.spell.target.tooMany"));

      return { ok: true, targetIds: picked.map((p) => p.basicInfo.id) };
    }
  }
}

const upcastExtra = (caster: BattleParticipant, spell: SpellRef, mapCtx?: SpellMapContext): number =>
  isFiveE(caster) && mapCtx?.castLevel !== undefined && mapCtx.upcastTargets ? mapCtx.upcastTargets * upcastSteps(spell.level, mapCtx.castLevel) : 0;

const HOSTILE_KINDS = new Set(["enemy", "area", "template", "allEnemies"]);

function hostile(targeting: SpellTargetingDef): boolean {
  if (targeting.kind === "area" || targeting.kind === "template") return targeting.side === "enemy";

  return HOSTILE_KINDS.has(targeting.kind);
}

export function resolveSpellTargets(
  ps: BattleParticipant[],
  caster: BattleParticipant,
  spell: SpellRef,
  targeting: SpellTargetingDef,
  chosenIds: string[],
  mapCtx?: SpellMapContext,
): SpellTargetResolution {
  const extra = upcastExtra(caster, spell, mapCtx);

  const widened = extra > 0 && (targeting.kind === "area" || targeting.kind === "template") ? { ...targeting, maxTargets: targeting.maxTargets + extra } : targeting;

  const res = resolveRaw(ps, caster, spell, widened, chosenIds, mapCtx);

  const charmers = conditionSourceIds(caster, "charmed");

  if (!res.ok || !charmers.length || !hostile(targeting)) return res;

  const targetIds = res.targetIds.filter((id) => !charmers.includes(id));

  if (targetIds.length === res.targetIds.length) return res;

  return targetIds.length > 0 ? { ...res, targetIds } : fail(textRef("battleActions.spell.target.charmerHostile"));
}
