import { coreActionCost, isAttackAction, standUpCost, validateCoreAction } from "./availability";
import { disengageEffect, dodgeEffect, helpEffect, hiddenEffect } from "./effects";
import { reject } from "./errors";
import { runEscape, runGrapple, runShove } from "./grapple";
import { pickMeleeAttack, reactionBlocker } from "./reaction";
import { CORE_ACTION_REGISTRY, type CoreActionKey } from "./registry";
import type { CoreActionBody } from "./schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isActive, isAttackable, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { type TimedEffectInput, upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { canAttackFromPool, spendFromPool } from "@/lib/utils/battle/attack/attacks-left";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { resolveServerAttack } from "@/lib/utils/battle/attack/server-attack";
import { assertAttackAllowed } from "@/lib/utils/battle/attack-phase/request";
import { passivePerception, rollCheck } from "@/lib/utils/battle/checks";
import { type ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { removeEffects } from "@/lib/utils/battle/conditions";
import { attackReachError } from "@/lib/utils/battle/grid/attack-reach";
import { baseMovement } from "@/lib/utils/battle/grid/path";
import { applyMainActionUsed } from "@/lib/utils/battle/participant/helpers";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface RunCoreActionInput {
  participants: BattleParticipant[];
  body: CoreActionBody;
  map: BattleMapConfig | null;
  rules: Ruleset;
  round: number;
  rng: () => number;
  battleId: string;
}

export interface RunCoreActionResult {
  participants: BattleParticipant[];
  messages: LogLine[];
  actions?: BattleAction[];
}

const TIMED_ACTIONS = {
  disengage: { icon: "🛡", effect: disengageEffect },
  dodge: { icon: "🌀", effect: dodgeEffect },
} as const satisfies Record<string, { icon: string; effect: (id: string) => TimedEffectInput }>;

function spendAction(actor: BattleParticipant, participants: BattleParticipant[], key: CoreActionKey): BattleParticipant {
  const attack = isAttackAction(key);

  if (!(attack && canAttackFromPool(actor)) && actor.actionFlags.hasUsedAction) throw new BattleRuleError("action_used", "Дію вже витрачено");

  return attack ? spendFromPool(actor, participants) : applyMainActionUsed(actor);
}

export function runCoreAction(input: RunCoreActionInput): RunCoreActionResult {
  const { body, participants, map, round, rules, rng } = input;

  const actor = findParticipant(participants, body.participantId);

  if (!actor) return reject(API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE);

  if (body.action === "readiedAttack") return readiedAttack(input, actor, body.targetId);

  const def = CORE_ACTION_REGISTRY[body.action];

  const name = actor.basicInfo.name;

  const cost = coreActionCost(body.action, actor, participants);

  if (cost === "bonusAction" && actor.actionFlags.hasUsedBonusAction) throw new BattleRuleError("action_used", "Бонусну дію вже використано");

  const spent = cost === "action" ? spendAction(actor, participants, body.action) : cost === "bonusAction" ? { ...actor, actionFlags: { ...actor.actionFlags, hasUsedBonusAction: true } } : actor;

  const invalid = validateCoreAction(body.action, actor, participants, map, "targetId" in body ? body.targetId : undefined);

  if (invalid) return reject(invalid);

  const done = (icon: string, next: BattleParticipant, tail = ""): RunCoreActionResult => ({ participants: replaceParticipant(participants, next), messages: [`${icon} ${name}: ${def.label}${tail}`] });

  const grappleInput = () => ({ actor: spent, participants: replaceParticipant(participants, spent), map, round, rules, rng });

  const out = (r: { participants: BattleParticipant[]; message: LogLine }): RunCoreActionResult => ({ participants: r.participants, messages: [r.message] });

  switch (body.action) {
    case "dash": {
      const gained = baseMovement(spent);

      return done("🏃", { ...spent, battleData: { ...spent.battleData, extraMovement: (spent.battleData.extraMovement ?? 0) + gained } }, ` (+${gained} кл. руху)`);
    }

    case "disengage":
    case "dodge": {
      const { icon, effect } = TIMED_ACTIONS[body.action];

      return done(icon, upsertTimedEffect(spent, effect(actor.basicInfo.id), round));
    }

    case "help": {
      const target = findParticipant(participants, body.targetId) ?? reject("Цілі немає в бою");

      const withSpent = replaceParticipant(participants, spent);

      const helped = upsertTimedEffect(findParticipant(withSpent, target.basicInfo.id) ?? target, { ...helpEffect(actor.basicInfo.id), source: { participantId: actor.basicInfo.id, name } }, round);

      return { participants: replaceParticipant(withSpent, helped), messages: [`🤝 ${name}: ${def.label} — ${target.basicInfo.name} має перевагу на наступну атаку`] };
    }

    case "standUp": {
      const { participant } = removeEffects(actor, (e) => e.effects.some((m) => m.type === "prone"));

      return done("🧍", { ...participant, battleData: { ...participant.battleData, movementUsed: (participant.battleData.movementUsed ?? 0) + standUpCost(actor) } });
    }

    case "hide": {
      const check = rollCheck({ actor, subject: { skill: "stealth" }, participants, rules, rng });

      const dc = Math.max(0, ...participants.filter((p) => p.basicInfo.side !== actor.basicInfo.side && isActive(p)).map((p) => passivePerception(p, participants, rules)));

      const text = ` — 🎲 Скритність ${check.total} проти пасивного Сприйняття ${dc}`;

      return check.total < dc ? done("🫥", spent, `${text}, помічено`) : done("🫥", upsertTimedEffect(spent, hiddenEffect(actor.basicInfo.id), round), `${text}, схований`);
    }

    case "ready":
      return done("⏳", { ...spent, battleData: { ...spent.battleData, readied: { kind: "attack" as const, round } } });

    case "grapple":
      return out(runGrapple({ ...grappleInput(), targetId: body.targetId }));

    case "shove":
      return out(runShove({ ...grappleInput(), targetId: body.targetId, mode: body.mode }));

    case "escape":
      return out(runEscape(grappleInput()));
  }
}

function readiedAttack(input: RunCoreActionInput, actor: BattleParticipant, targetId: string): RunCoreActionResult {
  const { participants, map, round, rng } = input;

  if (!actor.battleData.readied) return reject("Атаку не підготовлено");

  const blocker = reactionBlocker(actor);

  if (blocker) return reject(blocker);

  const target = findParticipant(participants, targetId);

  if (!target || target.basicInfo.side === actor.basicInfo.side || !isAttackable(target)) return reject("Ціллю має бути живий ворог");

  const disabled = getDisabledAttackKinds(actor);

  const attack = pickMeleeAttack(actor) ?? actor.battleData.attacks.find((a) => a.hand !== "off" && !disabled[attackKindOf(a.type)]);

  if (!attack) return reject("У учасника немає атаки");

  assertAttackAllowed(actor, attack, [target]);

  const reach = attackReachError(map, participants, actor, attack, [target]);

  if (reach) return reject(reach);

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map, rules: input.rules } };

  const { battleAction } = resolveServerAttack({ flow, attackerId: actor.basicInfo.id, targetId, attack, currentRound: round, battleId: input.battleId, rng, label: "readied" });

  const fresh = findParticipant(flow.ps, actor.basicInfo.id) ?? actor;

  const spent = { ...fresh, battleData: { ...fresh.battleData, readied: undefined }, actionFlags: { ...fresh.actionFlags, hasUsedReaction: true } };

  return { participants: replaceParticipant(flow.ps, spent), messages: [], actions: [battleAction] };
}
