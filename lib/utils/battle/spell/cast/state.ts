import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { Amount, Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { newBattleAction } from "@/lib/utils/battle/common/new-action";
import type { SpellPower } from "@/lib/utils/battle/spell/power";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";

export interface Outcome {
  skip: boolean;
  factor: number;
  raceMultiplier: number;
}

export interface SpellCastState {
  flow: ActionFlow;
  spell: CastableSpell;
  /** Кастер до каста: сторона й множник балансу. */
  caster: BattleParticipant;
  targetIds: string[];
  /** Цілі каста й усі, кого зачепили власні ефекти заклинання — без тих, кого змінили лише тригери. */
  touchedIds: Set<string>;
  info: { spellId: string; school: string | null; level: number };
  ability: ResolvedAbility;
  power: SpellPower;
  saveDc: number;
  actionModifiers: Record<string, StaticEffect[]>;
  rng: () => number;
  saveRolls: Array<{ participantId: string; roll: number }>;
  saves: NonNullable<BattleAction["actionDetails"]["savingThrows"]>;
  damageSteps: Record<string, DamageStep[]>;
  outcomes: Map<string, Outcome>;
  summons: SummonRequest[];
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

  return typeof a === "object" && a !== null && "spellRoll" in a;
};

export const isDamageEffect = (e: Effect) => e.kind === "dealDamage" || e.kind === "dot";

export const NO_TARGET_KINDS = new Set<Effect["kind"]>(["note", "summon"]);

export const targetOf = (e: Effect) => (NO_TARGET_KINDS.has(e.kind) ? undefined : (e as { target?: string }).target);

export const isPerTarget = (e: Effect) => !NO_TARGET_KINDS.has(e.kind) && (targetOf(e) === undefined || targetOf(e) === "eventTarget");

export const flatEffects = (effects: Effect[]): Effect[] => effects.flatMap((e) => (e.kind === "randomOf" ? e.options : [e]));

export function abilityOf(spell: CastableSpell): ResolvedAbility {
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
