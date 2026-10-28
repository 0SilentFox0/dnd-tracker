import { spellLevelRoman } from "@/lib/constants/spells";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { isDying } from "@/lib/utils/battle/death-saves";
import { footprintDistance } from "@/lib/utils/battle/grid/geometry";
import { cellsOf, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { areaRadiusCells, feetToCells, templateArea } from "@/lib/utils/battle/grid/template";
import { modeTargetHiddenText } from "@/lib/utils/battle/modes/engine";
import { isUp } from "@/lib/utils/battle/participant/state";
import { casterSpellDice, upcastSteps } from "@/lib/utils/battle/spell/caster-dice";
import { spellNeedsSlot, spellSlotKey, spellSlotLeft } from "@/lib/utils/battle/spell/slot";
import { type AimScene, SKILL_AREA_TEMPLATE, type SkillRadius, skillRadiusArea, type SpellChain, spellTargetingFor, spellWideningOf } from "@/lib/utils/battle/spell/spell-targeting";
import { PACT_KEY, slotLevel, slotRestoreOrder } from "@/lib/utils/spells/slot-keys";
import type { SpellCastData } from "@/types/api";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type SpellTargetMode = "none" | "single" | "multi" | "all" | "template";

export interface SpellPick {
  spellId: string;
  level: number;
  targetMode: SpellTargetMode;
  /** кого можна обирати: союзник, ворог або полеглий союзник */
  targetSide?: "ally" | "enemy" | "dead";
  maxTargets?: number;
  template?: SpellTemplate;
  /** дальність у футах */
  range?: number;
  /** шаблон лишає зону: його можна поставити й без цілей */
  zone?: boolean;
  /** одиночне заклинання, розширене вмінням до кількох цілей: на карті — коло лише по своїй стороні */
  skillRadius?: SkillRadius;
  /** ланцюг на карті: гравець обирає першу ціль, решту рахує спільний spellChain */
  chain?: SpellChain;
  needsSaves: boolean;
  needsAttackRolls?: boolean;
  diceSlots: number[];
}

export interface SlotOption {
  key: string;
  label: string;
  castLevel: number;
  left: number;
}

export interface SpellFlowState {
  step: "closed" | "book" | "spell" | "targets" | "rolls" | "summary" | "submitting" | "result";
  casterId?: string;
  level: number;
  levelPinned?: boolean;
  pick?: SpellPick;
  targetIds: string[];
  aim?: GridPoint;
  saves: Record<string, number>;
  attacks: Record<string, number>;
  slotKey?: string;
  damage: (number | undefined)[];
  error?: string;
}

export type SpellFlowAction =
  | { type: "OPEN"; casterId: string; level: number; levels?: number[] }
  | { type: "SPELLS_LOADED"; levels: number[] }
  | { type: "SET_LEVEL"; level: number }
  | { type: "PICK"; pick: SpellPick; slotKey?: string }
  | { type: "SET_SLOT"; slotKey: string; pick: SpellPick }
  | { type: "SET_ATTACK"; id: string; value: number | undefined }
  | { type: "TO_TARGETS" }
  | { type: "TOGGLE_TARGET"; id: string }
  | { type: "PICK_TARGET"; id: string }
  | { type: "SET_AIM"; aim: GridPoint; targetIds: string[] }
  | { type: "CONFIRM_TARGETS" }
  | { type: "SET_SAVE"; id: string; value: number | undefined }
  | { type: "SET_DAMAGE"; index: number; value: number | undefined }
  | { type: "TO_SUMMARY" }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "SUCCESS" }
  | { type: "FAIL"; error: string }
  | { type: "CLOSE" };

export const initialSpellFlow: SpellFlowState = { step: "closed", level: 0, targetIds: [], saves: {}, attacks: {}, damage: [] };

const needsRolls = (p: SpellPick) => p.needsSaves || !!p.needsAttackRolls || p.diceSlots.length > 0;

export function rollsComplete(s: SpellFlowState): boolean {
  if (!s.pick) return false;

  return s.pick.diceSlots.every((_, i) => typeof s.damage[i] === "number");
}

const afterTargets = (s: SpellFlowState): SpellFlowState =>
  s.pick && needsRolls(s.pick) ? { ...s, step: "rolls" } : { ...s, step: "summary" };

const BACK_ORDER: SpellFlowState["step"][] = ["book", "spell", "targets", "rolls", "summary"];

function previousStep(s: SpellFlowState): SpellFlowState["step"] | null {
  let i = BACK_ORDER.indexOf(s.step) - 1;

  if (BACK_ORDER[i] === "rolls" && s.pick && !needsRolls(s.pick)) i -= 1;

  if (BACK_ORDER[i] === "targets" && (s.pick?.targetMode === "none" || s.pick?.targetMode === "all")) i -= 1;

  return i >= 0 ? BACK_ORDER[i] : null;
}

export const canGoBack = (s: SpellFlowState): boolean => previousStep(s) !== null;

const firstLevelWithSpells = (current: number, levels: number[]): number =>
  levels.length === 0 || levels.includes(current) ? current : Math.min(...levels);

export function spellFlow(s: SpellFlowState, a: SpellFlowAction): SpellFlowState {
  switch (a.type) {
    case "OPEN":
      return { ...initialSpellFlow, step: "book", casterId: a.casterId, level: firstLevelWithSpells(a.level, a.levels ?? []) };
    case "SPELLS_LOADED":
      return s.step !== "book" || s.levelPinned ? s : { ...s, level: firstLevelWithSpells(s.level, a.levels) };
    case "SET_LEVEL":
      return { ...initialSpellFlow, step: "book", casterId: s.casterId, level: a.level, levelPinned: true };
    case "PICK":
      return { ...s, step: "spell", pick: a.pick, slotKey: a.slotKey, targetIds: [], aim: undefined, saves: {}, attacks: {}, damage: a.pick.diceSlots.map(() => undefined), error: undefined };
    case "SET_SLOT": {
      const sameDice = s.pick?.diceSlots.length === a.pick.diceSlots.length && s.pick.diceSlots.every((d, i) => d === a.pick.diceSlots[i]);

      const targetIds = a.pick.maxTargets === undefined ? s.targetIds : s.targetIds.slice(0, a.pick.maxTargets);

      const kept = <T,>(rolls: Record<string, T>) => Object.fromEntries(Object.entries(rolls).filter(([id]) => targetIds.includes(id)));

      const next: SpellFlowState = {
        ...s,
        pick: a.pick,
        slotKey: a.slotKey,
        targetIds,
        saves: kept(s.saves),
        attacks: kept(s.attacks),
        damage: sameDice ? s.damage : a.pick.diceSlots.map(() => undefined),
        error: undefined,
      };

      return next.step === "summary" && !rollsComplete(next) ? { ...next, step: "rolls" } : next;
    }
    case "SET_ATTACK": {
      const { [a.id]: _cleared, ...rest } = s.attacks;

      return { ...s, attacks: a.value === undefined ? rest : { ...rest, [a.id]: a.value } };
    }
    case "TO_TARGETS":
      if (!s.pick) return s;

      return s.pick.targetMode === "none" || s.pick.targetMode === "all" ? afterTargets(s) : { ...s, step: "targets" };
    case "TOGGLE_TARGET": {
      if (s.pick?.targetMode === "single") return { ...s, targetIds: [a.id], saves: {} };

      if (s.targetIds.includes(a.id)) {
        const { [a.id]: _gone, ...saves } = s.saves;

        return { ...s, targetIds: s.targetIds.filter((id) => id !== a.id), saves };
      }

      if (s.pick?.maxTargets !== undefined && s.targetIds.length >= s.pick.maxTargets) return s;

      return { ...s, targetIds: [...s.targetIds, a.id] };
    }
    case "PICK_TARGET": {
      if (s.step !== "targets") return s;

      const next = spellFlow(s, { type: "TOGGLE_TARGET", id: a.id });

      return next.pick?.targetMode === "single" && !next.pick.chain ? spellFlow(next, { type: "CONFIRM_TARGETS" }) : next;
    }
    case "SET_AIM": {
      if (s.step !== "targets" || s.pick?.targetMode !== "template") return s;

      const saves = Object.fromEntries(Object.entries(s.saves).filter(([id]) => a.targetIds.includes(id)));

      return { ...s, aim: a.aim, targetIds: a.targetIds, saves };
    }
    case "CONFIRM_TARGETS":
      if (s.step !== "targets") return s;

      if (s.pick?.targetMode === "template") return s.aim ? afterTargets(s) : s;

      return s.targetIds.length === 0 ? s : afterTargets(s);
    case "SET_SAVE": {
      const { [a.id]: _cleared, ...rest } = s.saves;

      return { ...s, saves: a.value === undefined ? rest : { ...rest, [a.id]: a.value } };
    }
    case "SET_DAMAGE":
      return { ...s, damage: s.damage.map((v, i) => (i === a.index ? a.value : v)) };
    case "TO_SUMMARY":
      return rollsComplete(s) ? { ...s, step: "summary", error: undefined } : s;
    case "BACK": {
      const prev = previousStep(s);

      return prev ? { ...s, step: prev, error: undefined } : s;
    }
    case "SUBMIT":
      return s.step === "summary" ? { ...s, step: "submitting", error: undefined } : s;
    case "SUCCESS":
      return { ...s, step: "result" };
    case "FAIL":
      return { ...s, step: "summary", error: a.error };
    case "CLOSE":
      return initialSpellFlow;
  }
}

function withTargets(s: SpellFlowState, ids: string[]): SpellFlowState {
  if (ids.length === s.targetIds.length && ids.every((id, i) => id === s.targetIds[i])) return s;

  return { ...s, targetIds: ids, saves: Object.fromEntries(Object.entries(s.saves).filter(([id]) => ids.includes(id))) };
}

/** Шаблон: цілі — ті, кого точка зачіпає зараз; рух після наведення змінює список, тож підказки й каст беруть живий. */
export function withLiveAimTargets(s: SpellFlowState, liveIds: string[]): SpellFlowState {
  return s.pick?.targetMode === "template" && s.aim ? withTargets(s, liveIds) : s;
}

/** «all»: цілі не обирають — уся сторона заклинання зараз, тож рятунки й підсумок бачать живий список. */
export function withAllTargets(s: SpellFlowState, sideIds: string[]): SpellFlowState {
  return s.pick?.targetMode === "all" ? withTargets(s, sideIds) : s;
}

/** Ланцюг: обрана лише перша ціль, а рятунки й підсумок бачать увесь ланцюг від неї. */
export function withChainTargets(s: SpellFlowState, chainIds: string[]): SpellFlowState {
  return s.pick?.chain && s.targetIds.length > 0 ? withTargets(s, chainIds) : s;
}

export function spellPayload(s: SpellFlowState): SpellCastData {
  const saves = Object.entries(s.saves).map(([participantId, roll]) => ({ participantId, roll }));

  const attacks = s.pick?.needsAttackRolls ? Object.entries(s.attacks).filter(([id]) => s.targetIds.includes(id)).map(([participantId, roll]) => ({ participantId, roll })) : [];

  return {
    casterId: s.casterId as string,
    spellId: s.pick?.spellId as string,
    targetIds: s.pick?.targetMode === "none" ? [] : s.pick?.chain ? s.targetIds.slice(0, 1) : s.targetIds,
    ...(s.pick?.targetMode === "template" && s.aim && { targetCell: s.aim }),
    diceRolls: s.damage.filter((v): v is number => typeof v === "number"),
    ...(saves.length > 0 && { saveRolls: saves }),
    ...(attacks.length > 0 && { attackRolls: attacks }),
    ...(s.slotKey && { slotKey: s.slotKey }),
  };
}

export const spellDefinition = (s: BookSpell) => ({
  dice: s.dice ?? 0,
  cost: s.cost ?? "action",
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

export function slotOptions(caster: BattleParticipant | null, spellLevel: number): SlotOption[] {
  const slots = caster?.spellcasting?.spellSlots;

  if (!caster || !slots || !isFiveE(caster) || spellLevel < 1) return [];

  return slotRestoreOrder(slots).flatMap((key) => {
    const castLevel = slotLevel(slots, key);

    const left = slots[key]?.current ?? 0;

    if (castLevel < spellLevel || left <= 0) return [];

    return [{ key, castLevel, left, label: key === PACT_KEY ? `Пакт · коло ${castLevel}` : `Коло ${castLevel}` }];
  });
}

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

  const template = targeting.kind === "template" && onMap ? { shape: targeting.shape, size: targeting.size, ...(targeting.hollow && { hollow: true }) } : skillRadius && SKILL_AREA_TEMPLATE;

  const isMulti = !chain && (targeting.kind === "area" || targeting.kind === "template");

  const auto = AUTO_TARGETING.includes(targeting.kind);

  const targetMode: SpellPick["targetMode"] = template ? "template" : auto ? "none" : isMulti ? "multi" : skill.mode === "all" ? "all" : skill.mode === "area" ? "multi" : "single";

  const maxTargets = template ? undefined : isMulti ? targeting.maxTargets + extra : skill.mode === "area" ? skill.maxTargets : undefined;

  const range = "range" in targeting ? targeting.range : undefined;

  const dice = caster ? casterSpellDice(caster, { dice: def.dice, groupId: s.spellGroup?.id ?? null, level: s.level, dieSides: s.dieSides, upcastDice: s.upcastDice }, opts.castLevel) : { count: def.dice, sides: 6 };

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

/** Скільки разів ще можна кастувати коло; кантрипи та вільний каст DM безлімітні. */
export function spellSlotsLeft(caster: BattleParticipant | null, level: number, free: boolean): number {
  return !spellNeedsSlot(level) || !caster || free ? Infinity : spellSlotLeft(caster, level);
}

export const casterUsesUniversalSlot = (caster: BattleParticipant | null): boolean => !!caster && spellSlotKey(caster, 1) === "universal";

export function spellSlotCostLabel(spell: BookSpell, opts: { free: boolean; universal: boolean; chosen?: string }): string | null {
  if (!spellNeedsSlot(spell.level)) return null;

  if (opts.free) return "Вільний каст DM — слот не витрачається.";

  if (opts.chosen) return `Витратить слот: ${opts.chosen}.`;

  return opts.universal ? "Витратить універсальний слот." : `Витратить слот ${spellLevelRoman(spell.level)} кола.`;
}

export interface SpellWidening {
  /** коротко для рядка списку */
  badge: string;
  /** повністю для деталей заклинання */
  note: string;
}

const ALL_OF_SIDE = { enemy: "усі вороги", ally: "усі союзники" } as const;

/** Одиночне заклинання, яке вміння заклинателя б'є по кількох цілях, — з назвою вміння. */
export function spellWidening(order: BattleParticipant[], caster: BattleParticipant | null, s: BookSpell, onMap: boolean): SpellWidening | null {
  const { targeting } = spellDefinition(s);

  if (!caster || (targeting.kind !== "ally" && targeting.kind !== "enemy")) return null;

  const w = spellWideningOf(order, caster.basicInfo.id, spellSpec(s));

  if (w.mode === "single") return null;

  const badge = w.mode === "all" ? ALL_OF_SIDE[targeting.kind] : `до ${w.maxTargets} цілей`;

  const side = 2 * areaRadiusCells(SKILL_AREA_TEMPLATE.size) + 1;

  return { badge, note: `${w.source ?? "Вміння"}: ${badge}${onMap && w.mode === "area" ? ` (на карті — зона ${side}×${side})` : ""}` };
}
