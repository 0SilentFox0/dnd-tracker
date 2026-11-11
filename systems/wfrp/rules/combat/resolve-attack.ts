import { skillTarget, value } from "../characteristics/derive";
import { againstMod, selfTestMod } from "../conditions/test-mod";
import { qualityFumbleFrom, qualityToHit } from "../equipment/quality-effects";
import { type PercentileTestResult, resolvePercentileTest } from "../percentile";
import type { PercentileAttackDetails } from "../percentile/details";
import { DIFFICULTY_SL } from "../percentile/difficulty";
import { applyFortune } from "../percentile/fortune";
import { ACTION_SLOT, ATTACK_SLOT, SCENE_SLOT } from "../slots";
import { sizeHitMod } from "../traits/size";
import { MOMENTUM_SL_BONUS, OUTNUMBERING_BONUS } from "./constants";
import { hitLocation } from "./location";
import { percentileLines } from "./log";
import { heldBy, settle } from "./momentum";
import { resolveOpposed } from "./opposed";
import { participantChars } from "./participant";

import { AttackType } from "@/lib/constants/battle";
import { textRef } from "@/lib/i18n/text-ref";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { isAdjacent } from "@/lib/utils/battle/grid/occupancy";
import type { ResolveAttackCtx,ResolvedAttack } from "@/lib/utils/rules/systems/types";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const attackCharacteristicOf = (attack: BattleAttack) => (attackKindOf(attack.type) === AttackType.RANGED ? "bs" : "ws") as "bs" | "ws";

const attackBaseTargetOf = (attacker: BattleParticipant, attack: BattleAttack): number => value(participantChars(attacker), attackCharacteristicOf(attack));

const attackerTargetOf = (attacker: BattleParticipant, attack: BattleAttack): number => attackBaseTargetOf(attacker, attack) + selfTestMod(attacker, "attack");

export const wfrpAttackTarget = (attacker: BattleParticipant, attack: BattleAttack) => ({ label: textRef(`gameTerms.characteristics.${attackCharacteristicOf(attack)}.label`), target: attackerTargetOf(attacker, attack) });

// Positions are required: without a map nobody counts as outnumbering.
function isOutnumbering(attacker: BattleParticipant, target: BattleParticipant, participants: BattleParticipant[]): boolean {
  const near = (of: BattleParticipant, side: BattleParticipant["basicInfo"]["side"]) =>
    participants.filter((p) => p.basicInfo.side === side && isActive(p) && (p.basicInfo.id === of.basicInfo.id || isAdjacent(p, of))).length;

  if (!isAdjacent(attacker, target)) return false;

  return near(target, attacker.basicInfo.side) >= 2 * near(attacker, target.basicInfo.side);
}

const sidesOf = (ctx: ResolveAttackCtx) => ({ attacker: ctx.attacker.basicInfo.side, target: ctx.target.basicInfo.side });

const heldOf = (ctx: ResolveAttackCtx) => {
  const m = SCENE_SLOT.read(ctx.sceneState) ?? {};

  const sides = sidesOf(ctx);

  return { m, sides, attacker: heldBy(m, sides.attacker), defender: heldBy(m, sides.target) };
};

function toResult(ctx: ResolveAttackCtx, details: PercentileAttackDetails, isHit: boolean, momentum: { spent: boolean; gainedBy: "attacker" | "defender" | null }): ResolvedAttack {
  const { m, sides } = heldOf(ctx);

  const { next, gained } = settle(m, sides, momentum);

  return {
    isHit,
    scene: SCENE_SLOT.write(next),
    defenseValue: details.defender?.target ?? 0,
    lines: [...percentileLines(details, isHit), ...(gained ? [textRef("battleLog.percentile.momentum")] : [])],
    attackRoll: {
      isHit,
      isCritical: details.doubles && isHit,
      isCriticalFail: false,
      totalAttackValue: details.roll,
      attackBonus: 0,
      advantageUsed: false,
      chosenD20: details.roll,
      system: ACTION_SLOT.write({ attack: details }),
      margin: details.netSl,
      location: details.location,
    },
  };
}

const detailsOf = (t: PercentileTestResult, netSl: number, extra: Partial<PercentileAttackDetails> = {}): PercentileAttackDetails => ({
  roll: t.roll,
  target: t.target,
  sl: t.sl,
  netSl,
  location: hitLocation(t.rawRoll),
  doubles: t.doubles,
  ...extra,
});

const refsOf = (attack: BattleAttack) => {
  const slot = ATTACK_SLOT.read(attack.system);

  return { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] };
};

export function resolveWfrpAttack(ctx: ResolveAttackCtx): ResolvedAttack {
  const { attacker, target, attack, participants, rng, manualRoll } = ctx;

  const toHit = qualityToHit(refsOf(attack));

  const fumbleFrom = qualityFumbleFrom(refsOf(attack));

  const fumbled = (roll: number) => fumbleFrom !== undefined && roll >= fumbleFrom;

  const talentSl = collectModifiers(withSelf(participants, attacker), attacker.basicInfo.id, { stat: "attackBonus", attackKind: attackKindOf(attack.type) }).flat;

  const slBonus = (ctx.fortune?.kind === "sl" ? 1 : 0) + talentSl;

  const marked = (r: ResolvedAttack, fortune?: ResolvedAttack["fortune"]): ResolvedAttack => {
    if (!fortune) return r;

    const fortuneLine = textRef(fortune.kind === "reroll" ? "battleWfrp.log.fortuneReroll" : "battleWfrp.log.fortuneSl", { name: attacker.basicInfo.name, first: fortune.firstRoll ?? 0 });

    const attack = ACTION_SLOT.read(r.attackRoll.system)?.attack;

    return { ...r, fortune, fortuneLine, attackRoll: { ...r.attackRoll, ...(attack && { system: ACTION_SLOT.write({ attack: { ...attack, fortune } }) }) } };
  };

  if (attackKindOf(attack.type) === AttackType.RANGED) {
    const rangedOnce = (presetRoll?: number) => {
      const test = resolvePercentileTest({ target: attackerTargetOf(attacker, attack) + againstMod(target, "ranged") + toHit + sizeHitMod(attacker, target), slModifier: DIFFICULTY_SL.challenging + slBonus, doubles: true, rng, presetRoll });

      const isHit = (test.outcome === "success" || test.outcome === "critical") && !fumbled(test.roll);

      return { roll: test.roll, result: toResult(ctx, detailsOf(test, test.sl), isHit, { spent: false, gainedBy: null }) };
    };

    const { result, fortune } = applyFortune<ReturnType<typeof rangedOnce>>((preset) => rangedOnce(preset), ctx.fortune, (r) => r.result.isHit, manualRoll);

    return marked(result.result, fortune);
  }

  const d = participantChars(target);

  const dodge = skillTarget(d, "dodge")?.target ?? value(d, "ag");

  const held = heldOf(ctx);

  const spent = held.attacker;

  const meleeOnce = (presetRolls: { attacker?: number; defender?: number }) => {
    const result = resolveOpposed({
      attackerTarget: attackerTargetOf(attacker, attack) + toHit + againstMod(target, "melee") + sizeHitMod(attacker, target) + (isOutnumbering(attacker, target, participants) ? OUTNUMBERING_BONUS : 0),
      defenderTargets: [
        { kind: "parry", target: value(d, "ws") + selfTestMod(target, "test") },
        { kind: "dodge", target: dodge + selfTestMod(target, "test") },
      ],
      attackerSlMod: (spent ? MOMENTUM_SL_BONUS : 0) + slBonus,
      defenderSlMod: held.defender ? MOMENTUM_SL_BONUS : 0,
      rng,
      presetRolls,
    });

    const details = detailsOf(result.attacker, result.netSl, {
      defender: { kind: result.defender.kind, roll: result.defender.roll, sl: result.defender.sl, target: result.defender.target },
      opposed: true,
      ...(spent && { momentumUsed: true }),
    });

    return { roll: result.attacker.roll, defenderRaw: result.defender.rawRoll, resolved: toResult(ctx, details, result.isHit && !fumbled(result.attacker.roll), { spent, gainedBy: result.attackerWon ? "attacker" : "defender" }) };
  };

  const { result, fortune } = applyFortune<ReturnType<typeof meleeOnce>>(
    (preset, first) => meleeOnce(first ? { attacker: preset, defender: first.defenderRaw } : { attacker: preset }),
    ctx.fortune,
    (r) => r.resolved.isHit,
    manualRoll,
  );

  return marked(result.resolved, fortune);
}
