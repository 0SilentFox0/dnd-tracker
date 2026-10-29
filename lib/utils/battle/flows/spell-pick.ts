import type { SpellFlowState, SpellPick, SpellWidening } from "./spell-flow-types";

import { textRef } from "@/lib/i18n/text-ref";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { isDying } from "@/lib/utils/battle/death-saves";
import { footprintDistance } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { areaRadiusCells, feetToCells, templateArea } from "@/lib/utils/battle/grid/template";
import { modeTargetHiddenText } from "@/lib/utils/battle/modes/engine";
import { isUp } from "@/lib/utils/battle/participant/state";
import { casterSpellDice, upcastSteps } from "@/lib/utils/battle/spell/caster-dice";
import { type AimScene, SKILL_AREA_TEMPLATE, type SkillRadius, skillRadiusArea, type SpellChain, spellTargetingFor, spellWideningOf } from "@/lib/utils/battle/spell/spell-targeting";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export const spellDefinition = (s: BookSpell) => ({
  dice: s.dice ?? 0,
  cost: s.cost ?? "action",
  casting: s.casting,
  targeting: s.targeting ?? ({ kind: "enemy" } as const),
  resolution: s.resolution ?? ({ kind: "auto" } as const),
});

export const spellSpec = (s: BookSpell) => ({ id: s.id, groupId: s.spellGroup?.id ?? null, level: s.level });

export function spellTargetSide(s: BookSpell | null): SpellPick["targetSide"] {
  const t = s ? spellDefinition(s).targeting : null;

  if (!t) return undefined;

  if (t.kind === "allyDead") return "dead";

  if (t.kind === "ally" || t.kind === "enemy") return t.kind;

  return t.kind === "area" || t.kind === "template" ? t.side : undefined;
}

const AUTO_TARGETING = ["self", "allAllies", "allAlliesDead", "allEnemies", "everyone"];

export function buildSpellPick(order: BattleParticipant[], caster: BattleParticipant | null, s: BookSpell, map: BattleMapConfig | null = null, opts: { castLevel?: number } = {}): SpellPick {
  const def = spellDefinition(s);

  const { targeting } = def;

  const onMap = !!map && !!caster && isOnMap(caster);

  const base = caster && (targeting.kind === "ally" || targeting.kind === "enemy") ? spellTargetingFor(order, caster.basicInfo.id, spellSpec(s)) : { mode: "single" as const, maxTargets: 1 };

  const extra = caster && isFiveE(caster) && opts.castLevel !== undefined && s.upcastTargets ? s.upcastTargets * upcastSteps(s.level, opts.castLevel) : 0;

  const skill = base.mode === "single" && extra > 0 ? { mode: "area" as const, maxTargets: 1 + extra } : base;

  const skillRadius: SkillRadius | undefined =
    onMap && base.mode === "area" && (targeting.kind === "ally" || targeting.kind === "enemy") ? { side: targeting.kind, maxTargets: base.maxTargets } : undefined;

  const chain: SpellChain | undefined = onMap && targeting.kind === "area" && targeting.chain ? { side: targeting.side, maxTargets: targeting.maxTargets + extra } : undefined;

  const template = targeting.kind === "template" && onMap ? { shape: targeting.shape, size: targeting.size, ...(targeting.exact !== undefined && { exact: targeting.exact }), ...(targeting.hollow && { hollow: true }) } : skillRadius && SKILL_AREA_TEMPLATE;

  const isMulti = !chain && (targeting.kind === "area" || targeting.kind === "template");

  const auto = AUTO_TARGETING.includes(targeting.kind);

  const targetMode: SpellPick["targetMode"] = template ? "template" : auto ? "none" : isMulti ? "multi" : skill.mode === "all" ? "all" : skill.mode === "area" ? "multi" : "single";

  const maxTargets = template ? undefined : isMulti ? targeting.maxTargets + extra : skill.mode === "area" ? skill.maxTargets : undefined;

  const range = "range" in targeting ? targeting.range : undefined;

  const dice = caster ? casterSpellDice(caster, { dice: def.dice, groupId: s.spellGroup?.id ?? null, level: s.level, dieSides: s.dieSides, upcastDice: s.upcastDice, fixedDice: s.fixedDice }, opts.castLevel) : { count: def.dice, sides: 6 };

  return {
    spellId: s.id,
    level: s.level,
    targetMode,
    targetSide: spellTargetSide(s),
    maxTargets,
    ...(template && { template }),
    ...(template && targeting.kind === "template" && targeting.zone && { zone: true }),
    ...(skillRadius && { skillRadius }),
    ...(chain && { chain }),
    ...(range !== undefined && { range }),
    needsSaves: def.resolution.kind === "save" && !auto,
    ...(def.resolution.kind === "attack" && !auto && { needsAttackRolls: true }),
    diceSlots: Array.from({ length: dice.count }, () => dice.sides),
  };
}

/** Кого зачіпає наведення в точці: та сама функція, що й на сервері. */
export function spellAimTargets(scene: AimScene, pick: SpellPick, aim: GridPoint): BattleParticipant[] {
  if (pick.skillRadius) return skillRadiusArea(scene, pick.skillRadius, aim).targets;

  return pick.template ? templateArea(scene.map, scene.participants, scene.caster, pick.template, aim).targets : [];
}

export function spellTargetCandidates(order: BattleParticipant[], caster: BattleParticipant | null, side: SpellPick["targetSide"]): BattleParticipant[] {
  return order.filter((p) => {
    if (!side || !caster) return isUp(p);

    const mine = p.basicInfo.side === caster.basicInfo.side;

    return side === "dead" ? mine && !isUp(p) : (isUp(p) || (side === "ally" && isDying(p))) && (side === "ally" ? mine : !mine);
  });
}

/** Дзеркалить серверну перевірку: поза картою чи без дальності обмеження немає. */
export function spellTargetInRange(map: BattleMapConfig | null, caster: BattleParticipant | null, target: BattleParticipant, range: number | undefined): boolean {
  if (!map || !caster || !isOnMap(caster) || target.battleData.position === undefined) return true;

  const inRange = range === undefined || footprintDistance(cellsOf(caster), cellsOf(target)) <= feetToCells(range);

  return inRange && !modeTargetHiddenText(map, caster, [target]);
}

export function spellSaveTargets(targets: BattleParticipant[], s: SpellFlowState, viewer: { isDM: boolean; userId: string | null }): BattleParticipant[] {
  if (!s.pick?.needsSaves) return [];

  return targets.filter((t) => s.targetIds.includes(t.basicInfo.id) && (viewer.isDM || t.basicInfo.controlledBy === viewer.userId));
}

/** Одиночне заклинання, яке вміння заклинателя б'є по кількох цілях, — з назвою вміння. */
export function spellWidening(order: BattleParticipant[], caster: BattleParticipant | null, s: BookSpell, onMap: boolean): SpellWidening | null {
  const { targeting } = spellDefinition(s);

  if (!caster || (targeting.kind !== "ally" && targeting.kind !== "enemy")) return null;

  const w = spellWideningOf(order, caster.basicInfo.id, spellSpec(s));

  if (w.mode === "single") return null;

  const badge = w.mode === "all" ? textRef(targeting.kind === "enemy" ? "battleWizards.flow.widening.allEnemy" : "battleWizards.flow.widening.allAlly") : textRef("battleWizards.flow.widening.maxTargets", { max: w.maxTargets });

  const side = 2 * areaRadiusCells(SKILL_AREA_TEMPLATE.size) + 1;

  const source = w.source ?? textRef("battleWizards.flow.widening.defaultSource");

  return { badge, note: onMap && w.mode === "area" ? textRef("battleWizards.flow.widening.noteArea", { source, badge, side }) : textRef("battleWizards.flow.widening.note", { source, badge }) };
}
