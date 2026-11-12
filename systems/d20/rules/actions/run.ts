import { readiedAttack } from "../reactions/readied";
import { coreActionCost, isAttackAction, standUpCost, validateCoreAction } from "./availability";
import { runEscape, runGrapple, runShove } from "./grapple";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { type TimedEffectInput } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { disengageEffect, dodgeEffect, helpEffect, hiddenEffect, upsertLabeled } from "@/lib/utils/battle/actions/effects";
import { reject } from "@/lib/utils/battle/actions/errors";
import type { CoreActionKey } from "@/lib/utils/battle/actions/keys";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import type { RunCoreActionInput, RunCoreActionResult } from "@/lib/utils/battle/actions/types";
import { canAttackFromPool, spendFromPool } from "@/lib/utils/battle/attack/attacks-left";
import { passivePerception, rollCheck } from "@/lib/utils/battle/checks";
import { removeEffects } from "@/lib/utils/battle/conditions";
import { baseMovement } from "@/lib/utils/battle/grid/path";
import { applyMainActionUsed } from "@/lib/utils/battle/participant/helpers";
import { ruleErrorOf } from "@/lib/utils/battle/store/errors";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const TIMED_ACTIONS = {
  disengage: { icon: "🛡", effect: disengageEffect },
  dodge: { icon: "🌀", effect: dodgeEffect },
} as const satisfies Record<string, { icon: string; effect: (id: string) => TimedEffectInput }>;

function spendAction(actor: BattleParticipant, participants: BattleParticipant[], key: CoreActionKey): BattleParticipant {
  const attack = isAttackAction(key);

  if (!(attack && canAttackFromPool(actor)) && actor.actionFlags.hasUsedAction) throw ruleErrorOf("action_used", actionReason("actionUsed"));

  return attack ? spendFromPool(actor, participants) : applyMainActionUsed(actor);
}

export function runCoreAction(input: RunCoreActionInput): RunCoreActionResult {
  const { body, participants, map, round, rules, rng } = input;

  const actor = findParticipant(participants, body.participantId);

  if (!actor) return reject(API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE);

  if (body.action === "readiedAttack") return readiedAttack(input, actor, body.targetId);

  const name = actor.basicInfo.name;

  const cost = coreActionCost(body.action, actor, participants);

  if (cost === "bonusAction" && actor.actionFlags.hasUsedBonusAction) throw ruleErrorOf("action_used", actionReason("bonusUsed"));

  const spent = cost === "action" ? spendAction(actor, participants, body.action) : cost === "bonusAction" ? { ...actor, actionFlags: { ...actor.actionFlags, hasUsedBonusAction: true } } : actor;

  const invalid = validateCoreAction(body.action, actor, participants, map, rules, "targetId" in body ? body.targetId : undefined);

  if (invalid) return reject(invalid);

  const actionName = dynamicTextRef(`battleCommon.coreActions.${body.action}`);

  const done = (icon: string, next: BattleParticipant, tail: LogLine = ""): RunCoreActionResult => ({ participants: replaceParticipant(participants, next), messages: [textRef("battleActions.core.done", { icon, name, action: actionName, tail })] });

  const grappleInput = () => ({ actor: spent, participants: replaceParticipant(participants, spent), map, round, rules, rng });

  const out = (r: { participants: BattleParticipant[]; message: LogLine }): RunCoreActionResult => ({ participants: r.participants, messages: [r.message] });

  switch (body.action) {
    case "dash": {
      const gained = baseMovement(spent, rules);

      return done("🏃", { ...spent, battleData: { ...spent.battleData, extraMovement: (spent.battleData.extraMovement ?? 0) + gained } }, textRef("battleActions.core.dashTail", { gained }));
    }

    case "disengage":
    case "dodge": {
      const { icon, effect } = TIMED_ACTIONS[body.action];

      return done(icon, upsertLabeled(spent, effect(actor.basicInfo.id), round));
    }

    case "help": {
      const target = findParticipant(participants, body.targetId) ?? reject(actionReason("targetMissing"));

      const withSpent = replaceParticipant(participants, spent);

      const helped = upsertLabeled(findParticipant(withSpent, target.basicInfo.id) ?? target, { ...helpEffect(actor.basicInfo.id), source: { participantId: actor.basicInfo.id, name } }, round);

      return { participants: replaceParticipant(withSpent, helped), messages: [textRef("battleActions.core.help", { name, action: actionName, target: target.basicInfo.name })] };
    }

    case "standUp": {
      const { participant } = removeEffects(actor, (e) => e.effects.some((m) => m.type === "prone"));

      return done("🧍", { ...participant, battleData: { ...participant.battleData, movementUsed: (participant.battleData.movementUsed ?? 0) + standUpCost(actor, rules) } });
    }

    case "hide": {
      const check = rollCheck({ actor, subject: { skill: "stealth" }, participants, rules, rng });

      const dc = Math.max(0, ...participants.filter((p) => p.basicInfo.side !== actor.basicInfo.side && isActive(p)).map((p) => passivePerception(p, participants, rules)));

      const params = { total: check.total, dc };

      return check.total < dc ? done("🫥", spent, textRef("battleActions.core.hideSpotted", params)) : done("🫥", upsertLabeled(spent, hiddenEffect(actor.basicInfo.id), round), textRef("battleActions.core.hideHidden", params));
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
