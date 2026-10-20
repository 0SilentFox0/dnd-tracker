import type { AttackFlow } from "../../attack/process/ability-flow";
import type { CastableSpell } from "../../types/spell-process";
import type { SpellPower } from "../power";

import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import type { Amount, Effect, StaticEffect } from "@/lib/utils/abilities/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleParticipant, DamageStep } from "@/types/battle";

export interface Outcome {
  skip: boolean;
  factor: number;
  raceMultiplier: number;
}

export interface SpellCastState {
  flow: AttackFlow;
  spell: CastableSpell;
  /** Кастер до каста: сторона й множник балансу. */
  caster: BattleParticipant;
  targetIds: string[];
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
  return {
    id: `spell-${caster.basicInfo.id}-${Date.now()}`,
    battleId,
    round,
    actionIndex: 0,
    timestamp: new Date(),
    actorId: caster.basicInfo.id,
    actorName: caster.basicInfo.name,
    actorSide: caster.basicInfo.side,
    actionType: "spell",
    targets: targets.map((t) => ({ participantId: t.basicInfo.id, participantName: t.basicInfo.name })),
    actionDetails: { spellId: spell.id, spellName: spell.name, spellLevel: spell.level },
    resultText: text,
    hpChanges: [],
    isCancelled: false,
  };
}
