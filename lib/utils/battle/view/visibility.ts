import { type BattleKnowledge, resolveObservedTraits } from "./knowledge";

import { ParticipantSide } from "@/lib/constants/battle";
import { lineKey, textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { BattleParticipantPatch } from "@/types/api";
import type { ActiveEffect, BattleAction, BattleParticipant, DamageStep } from "@/types/battle";
import type { LogLine } from "@/types/text";

export interface Viewer {
  userId: string | null;
  isDM: boolean;
  readOnly: boolean;
  canSeeEnemyHp: boolean;
}

export function canSeeExactStats(p: BattleParticipant, viewer: Viewer): boolean {
  return viewer.isDM || viewer.canSeeEnemyHp || p.basicInfo.side === ParticipantSide.ALLY;
}

export function canSeeEnemyHp(hero: BattleParticipant | null, order: BattleParticipant[]): boolean {
  if (!hero) return false;

  return findFlags(withSelf(order, hero), hero.basicInfo.id, "seeEnemyHp").length > 0;
}

// клієнт обирає героя за ходом, тож точні стати гарантовані лише коли прапорець має кожен герой гравця
export function alwaysSeesEnemyStats(order: BattleParticipant[], userId: string): boolean {
  const mine = order.filter((p) => p.basicInfo.controlledBy === userId);

  return mine.length > 0 && mine.every((p) => canSeeEnemyHp(p, order));
}

function hideDefense(line: LogLine): LogLine {
  if (typeof line === "string" || line.message !== "battleLog.percentile.opposed") return line;

  const { roll, target, sl, netSl } = line.params ?? {};

  return textRef("battleLog.percentile.opposedHidden", { roll: roll ?? 0, target: target ?? 0, sl: sl ?? 0, netSl: netSl ?? 0 });
}

export const PLAYER_VIEWER: Viewer = { userId: null, isDM: false, readOnly: true, canSeeEnemyHp: false };

export interface RedactionCtx {
  participants: BattleParticipant[];
  rules: Ruleset;
}

export function sanitizeLogEntry(e: BattleAction, viewer: Viewer, ctx: RedactionCtx): BattleAction {
  if (viewer.isDM) return e;

  const { participants } = ctx;

  const conditions = ruleSystemOf(ctx.rules).conditions;

  const conceal = conditions?.concealLine ?? ((l: LogLine) => l);

  const isMiscastLine = conditions?.isMiscastLine ?? (() => false);

  const concealed = (e.targets ?? []).some((t) => {
    const p = participants.find((x) => x.basicInfo.id === t.participantId);

    return !p || !canSeeExactStats(p, viewer);
  });

  const details = e.actionDetails ?? {};

  const actor = participants.find((x) => x.basicInfo.id === e.actorId);

  const casterConditions = (!!details.percentileCast?.miscast || !!e.log?.some(isMiscastLine)) && (!actor || !canSeeExactStats(actor, viewer));

  const { targetAC: _ac, damageBreakdown: _b, damageRows: _r, percentile, ...rest } = details;

  const hideNumbers = concealed || !e.targets?.length;

  const stripsNumbers = hideNumbers && ("targetAC" in details || "damageBreakdown" in details || "damageRows" in details);

  const stripsDefender = percentile?.defender !== undefined;

  const visible = casterConditions ? e.log?.filter((l) => !isMiscastLine(l)) : e.log;

  const lines = visible?.map((l) => (concealed || casterConditions ? conceal(hideDefense(l)) : hideDefense(l)));

  const linesChanged = !!lines && (lines.length !== e.log?.length || lines.some((l, i) => l !== e.log?.[i]));

  if (!stripsNumbers && !stripsDefender && !linesChanged && !casterConditions) return e;

  const base = hideNumbers ? rest : details;

  const withDefender = stripsDefender && percentile ? { ...base, percentile: { ...percentile, defender: undefined } } : base;

  const actionDetails = casterConditions && withDefender.percentileCast ? { ...withDefender, percentileCast: { ...withDefender.percentileCast, miscast: null } } : withDefender;

  return { ...e, actionDetails, ...(lines && { log: lines }) };
}

export function redactLogForPlayers(entries: BattleAction[], ctx: RedactionCtx): { entries: BattleAction[]; changed: boolean } {
  const redacted = entries.map((e) => sanitizeLogEntry(e, PLAYER_VIEWER, ctx));

  return { entries: redacted, changed: redacted.some((e, i) => e !== entries[i]) };
}

export function hiddenTargetSteps(steps: DamageStep[], targetId: string, log: BattleAction[], exact: boolean, knowledge?: BattleKnowledge): DamageStep[] {
  if (exact) return steps;

  const known = new Set(resolveObservedTraits(log, targetId, knowledge).map((t) => lineKey(t.label)));

  const allKnown = steps.every((s) => s.side === "attacker" || known.has(lineKey(s.label)));

  // after відомого кроку вже містить прихований опір, тож або всі кроки цілі, або жодного
  return allKnown ? steps : steps.filter((s) => s.side === "attacker");
}

const hidesEffects = (p: BattleParticipant) => !canSeeExactStats(p, PLAYER_VIEWER);

const withoutConcealed = (effects: ActiveEffect[]) => effects.filter((e) => !e.concealed);

function redactParticipant(p: BattleParticipant): BattleParticipant {
  const effects = p.battleData.activeEffects;

  if (!hidesEffects(p) || !effects.some((e) => e.concealed)) return p;

  return { ...p, battleData: { ...p.battleData, activeEffects: withoutConcealed(effects) } };
}

export function redactParticipantsForPlayers(participants: BattleParticipant[]): BattleParticipant[] {
  const redacted = participants.map(redactParticipant);

  return redacted.some((p, i) => p !== participants[i]) ? redacted : participants;
}

export function redactPatchesForPlayers(patches: BattleParticipantPatch[], participants: BattleParticipant[]): BattleParticipantPatch[] {
  const byId = new Map(participants.map((p) => [p.basicInfo.id, p]));

  const redacted = patches.map((patch) => {
    const owner = byId.get(patch.id);

    const effects = patch.battleData?.activeEffects;

    if (!owner || !hidesEffects(owner) || !effects?.some((e) => e.concealed)) return patch;

    return { ...patch, battleData: { ...patch.battleData, activeEffects: withoutConcealed(effects) } };
  });

  return redacted.some((p, i) => p !== patches[i]) ? redacted : patches;
}
