import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { Amount, Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { newBattleAction } from "@/lib/utils/battle/common/new-action";
import type { SpellPower } from "@/lib/utils/battle/spell/power";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { AnchoredZoneEffect, GrantCastEffect, HitRiderEffect, SpellDefinition, SpellEffect } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleParticipant, DamageStep, SpellGrant } from "@/types/battle";

export type ChosenSpell = Omit<CastableSpell, "definition"> & { definition: Omit<SpellDefinition, "effects"> & { effects: Effect[] } };

export interface Outcome {
  skip: boolean;
  factor: number;
  raceMultiplier: number;
  critExtra?: number;
  /** крит рятівного кидка: статуси заклинання на ціль не накладаються */
  negateEffects?: boolean;
}

export interface SpellCastState {
  flow: ActionFlow;
  spell: ChosenSpell;
  /** Кастер до каста: сторона й множник балансу. */
  caster: BattleParticipant;
  targetIds: string[];
  /** Цілі каста й усі, кого зачепили власні ефекти заклинання — без тих, кого змінили лише тригери. */
  touchedIds: Set<string>;
  info: { spellId: string; school: string | null; level: number; castLevel?: number };
  castLevel: number;
  chosenCastLevel?: number;
  ability: ResolvedAbility;
  grant?: SpellGrant;
  power: SpellPower;
  saveDc: number;
  attackBonus?: number;
  battleId: string;
  actionModifiers: Record<string, StaticEffect[]>;
  rng: () => number;
  saveRolls: Array<{ participantId: string; roll: number }>;
  attackRolls: Array<{ participantId: string; roll: number }>;
  diceCount: number;
  diceSides: number;
  attacks: NonNullable<BattleAction["actionDetails"]["spellAttacks"]>;
  saves: NonNullable<BattleAction["actionDetails"]["savingThrows"]>;
  damageSteps: Record<string, DamageStep[]>;
  outcomes: Map<string, Outcome>;
  summons: SummonRequest[];
  /** Сума фактичної шкоди (після опору) від усіх dealDamage цього касту. */
  dealt: number;
}

function amountOf(e: Effect): Amount | undefined {
  switch (e.kind) {
    case "dealDamage":
    case "heal":
      return e.amount;
    case "dot":
      return e.damagePerRound;
    case "hot":
      return e.healPerRound;
    default:
      return undefined;
  }
}

export const usesRoll = (e: Effect) => {
  const a = amountOf(e);

  return (typeof a === "object" && a !== null && "spellRoll" in a) || (e.kind === "dealDamage" && !!e.byDistance);
};

export const isDamageEffect = (e: Effect) => e.kind === "dealDamage" || e.kind === "dot";

export const NO_TARGET_KINDS = new Set<Effect["kind"]>(["note", "summon"]);

export const targetOf = (e: Effect) => (NO_TARGET_KINDS.has(e.kind) ? undefined : (e as { target?: string }).target);

export const isPerTarget = (e: Effect) => !NO_TARGET_KINDS.has(e.kind) && (targetOf(e) === undefined || targetOf(e) === "eventTarget");

/** Цільові ефекти, що читають шкоду касту: виконуються після нецільових. */
export const readsEventDamage = (e: Effect) => (e.kind === "heal" || e.kind === "dealDamage") && typeof e.amount === "object" && "percentOf" in e.amount && e.amount.percentOf === "eventDamage";

export const SPELL_ONLY_KINDS = new Set<string>(["inputDice", "grantCast", "hitRider", "moveSelf", "createTerrain", "anchoredZone"]);

export const flatEffects = (effects: Array<Effect | SpellEffect>): Effect[] => effects.flatMap((e) => (e.kind === "randomOf" || e.kind === "chooseOne" ? e.options : SPELL_ONLY_KINDS.has(e.kind) ? [] : [e as Effect]));

export const grantCastsOf = (effects: SpellEffect[]): Array<{ effect: GrantCastEffect; index: number }> => effects.flatMap((effect, index) => (effect.kind === "grantCast" ? [{ effect, index }] : []));

export const hitRidersOf = (effects: SpellEffect[]): Array<{ effect: HitRiderEffect; index: number }> => effects.flatMap((effect, index) => (effect.kind === "hitRider" ? [{ effect, index }] : []));

export const anchoredZonesOf = (effects: SpellEffect[]): Array<{ effect: AnchoredZoneEffect; index: number }> => effects.flatMap((effect, index) => (effect.kind === "anchoredZone" ? [{ effect, index }] : []));

export const hasMoveSelf = (effects: SpellEffect[]) => effects.some((e) => e.kind === "moveSelf");

export const inputDiceOf = (effects: SpellEffect[]): { label: string; max: number } | undefined => {
  const found = effects.find((e) => e.kind === "inputDice");

  return found?.kind === "inputDice" ? { label: found.label, max: found.max } : undefined;
};

export const needsOption = (effects: SpellEffect[]) => effects.some((e) => e.kind === "chooseOne");

export const optionInRange = (effects: SpellEffect[], index: number | undefined) =>
  effects.every((e) => e.kind !== "chooseOne" || (index !== undefined && Number.isInteger(index) && index >= 0 && index < e.options.length));

export const expandChosen = (effects: SpellEffect[], index = 0): Effect[] =>
  effects.flatMap((e) => (e.kind === "chooseOne" ? [e.options[index] ?? e.options[0]] : SPELL_ONLY_KINDS.has(e.kind) ? [] : [e as Effect]));

export function abilityOf(spell: ChosenSpell): ResolvedAbility {
  return {
    id: `spell-${spell.id}`,
    name: spell.name,
    trigger: { event: "spellCast", phase: "after", role: "caster" },
    effects: spell.definition.effects,
    stackable: spell.definition.stackable === true,
    maxStacks: spell.definition.maxStacks,
    key: `spell:${spell.id}`,
    source: { type: "skill", id: spell.id, name: spell.name, icon: spell.icon },
  } as ResolvedAbility;
}

export function actionOf(caster: BattleParticipant, spell: CastableSpell, targets: BattleParticipant[], battleId: string, round: number, text: string): BattleAction {
  return newBattleAction(caster, "spell", { battleId, round, targets }, {
    actionDetails: { spellId: spell.id, spellName: spell.name, spellLevel: spell.level, ...(spell.fx && { spellFx: spell.fx }) },
    resultText: text,
  });
}
