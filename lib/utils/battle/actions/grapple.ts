import { coreTimedKey } from "./effects";
import { reject } from "./errors";
import { actionReason } from "./reasons";

import { joinLines, textRef } from "@/lib/i18n/text-ref";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { checkBonus, rollCheck } from "@/lib/utils/battle/checks";
import { applyCondition5e, conditionSourceIds, hasCondition, PERMANENT_ROUNDS, removeEffects } from "@/lib/utils/battle/conditions";
import { GRAPPLE_KEY_PREFIX, grappledBy, grappleKey, releaseGrapples } from "@/lib/utils/battle/conditions/grapple-links";
import { canStand, isAdjacent } from "@/lib/utils/battle/grid/occupancy";
import { awayStep } from "@/lib/utils/battle/grid/push";
import { resolveSave, rollSave } from "@/lib/utils/battle/saves";
import { getSpellSaveDC } from "@/lib/utils/common/calculations";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { LogLine } from "@/types/text";

type RollInput = { participants: BattleParticipant[]; rules: Ruleset; rng: () => number };

const skillBonus = (p: BattleParticipant, skill: "athletics" | "acrobatics", ps: BattleParticipant[], rules: Ruleset) => {
  const { mod, bonus } = checkBonus(p, { skill }, ps, rules);

  return mod + bonus;
};

function bestSkill(p: BattleParticipant, ps: BattleParticipant[], rules: Ruleset): "athletics" | "acrobatics" {
  return skillBonus(p, "acrobatics", ps, rules) > skillBonus(p, "athletics", ps, rules) ? "acrobatics" : "athletics";
}

const grappleDc = (grappler: BattleParticipant, rules: Ruleset) => getSpellSaveDC(grappler.abilities.proficiencyBonus, grappler.abilities.modifiers.strength, rules.formulas.saveDcBase);

export function contest(input: { attacker: BattleParticipant; target: BattleParticipant } & RollInput): { success: boolean; message: LogLine; participants: BattleParticipant[] } {
  const { attacker, target, participants, rules, rng } = input;

  if (rules.actions.variant === "2024") {
    const ability = target.abilities.modifiers.dexterity > target.abilities.modifiers.strength ? "dexterity" : "strength";

    const dc = grappleDc(attacker, rules);

    const rolled = rollSave({ target, ability, dc, participants, rules, rng });

    const { result, participant, message } = resolveSave(target, rolled);

    return {
      success: !result.success,
      message: textRef(message ? "battleActions.grapple.contestSaveNote" : "battleActions.grapple.contestSave", { dc, target: target.basicInfo.name, total: rolled.total, ...(message && { note: message }) }),
      participants: message ? replaceParticipant(participants, participant) : participants,
    };
  }

  const mine = rollCheck({ actor: attacker, subject: { skill: "athletics" }, participants, rules, rng });

  const theirs = rollCheck({ actor: target, subject: { skill: bestSkill(target, participants, rules) }, participants, rules, rng });

  return { success: mine.total > theirs.total, message: textRef("battleActions.grapple.contestRoll", { mine: mine.total, theirs: theirs.total }), participants };
}

function escapeAgainstDc(input: { escaper: BattleParticipant; dc: number } & RollInput): { success: boolean; message: LogLine } {
  const { escaper, dc, participants, rules, rng } = input;

  const mine = rollCheck({ actor: escaper, subject: { skill: bestSkill(escaper, participants, rules) }, participants, rules, rng });

  return { success: mine.total >= dc, message: textRef("battleActions.grapple.contestDc", { mine: mine.total, dc }) };
}

export function escapeContest(input: { escaper: BattleParticipant; grappler: BattleParticipant } & RollInput): { success: boolean; message: LogLine } {
  const { escaper, grappler, participants, rules, rng } = input;

  if (rules.actions.variant === "2024") return escapeAgainstDc({ escaper, dc: grappleDc(grappler, rules), participants, rules, rng });

  const mine = rollCheck({ actor: escaper, subject: { skill: bestSkill(escaper, participants, rules) }, participants, rules, rng });

  const theirs = rollCheck({ actor: grappler, subject: { skill: "athletics" }, participants, rules, rng });

  return { success: mine.total > theirs.total, message: textRef("battleActions.grapple.contestRoll", { mine: mine.total, theirs: theirs.total }) };
}

export interface GrappleActionInput extends RollInput {
  actor: BattleParticipant;
  targetId: string;
  map: BattleMapConfig | null;
  round: number;
}

export interface GrappleActionResult {
  participants: BattleParticipant[];
  message: LogLine;
}

function applyHeld(input: GrappleActionInput, target: BattleParticipant, key: "grappled" | "prone", timedKey: string) {
  const { actor, participants, rules, round } = input;

  return applyCondition5e(participants, target.basicInfo.id, {
    key,
    rounds: PERMANENT_ROUNDS,
    permanent: true,
    source: { participantId: actor.basicInfo.id, name: actor.basicInfo.name },
    sourceName: actor.basicInfo.name,
    timedKey,
    round,
    rules,
  });
}

const targetOf = (input: GrappleActionInput) => findParticipant(input.participants, input.targetId) ?? reject(actionReason("targetMissing"));

export function runGrapple(input: GrappleActionInput): GrappleActionResult {
  const { actor, participants, rules } = input;

  const target = targetOf(input);

  const name = actor.basicInfo.name;

  if (hasCondition(target, "grappled") && conditionSourceIds(target, "grappled").includes(actor.basicInfo.id)) return reject(actionReason("alreadyGrappled"));

  const check = contest({ attacker: actor, target, participants, rules, rng: input.rng });

  if (!check.success) return { participants: check.participants, message: textRef("battleActions.grapple.grabFail", { name, target: target.basicInfo.name, check: check.message }) };

  const result = applyHeld(input, target, "grappled", grappleKey(actor.basicInfo.id));

  return { participants: result.participants, message: joinLines([textRef("battleActions.grapple.grab", { name, check: check.message }), ...result.messages], "; ") };
}

export function runShove(input: GrappleActionInput & { mode: "prone" | "push" }): GrappleActionResult {
  const { actor, participants, rules, map, mode } = input;

  const target = targetOf(input);

  if (mode === "push" && !map) return reject(actionReason("pushNeedsMap"));

  const name = actor.basicInfo.name;

  const check = contest({ attacker: actor, target, participants, rules, rng: input.rng });

  if (!check.success) return { participants: check.participants, message: textRef("battleActions.grapple.shoveFail", { name, target: target.basicInfo.name, check: check.message }) };

  const messages: LogLine[] = [textRef("battleActions.grapple.shove", { name, check: check.message })];

  const from = actor.battleData.position;

  const at = target.battleData.position;

  const dest = mode === "push" && from && at ? awayStep(from, at) : null;

  if (dest && map && canStand(map, participants, target, dest)) {
    messages.push(textRef("battleActions.grapple.pushed", { target: target.basicInfo.name }));

    return { participants: replaceParticipant(participants, { ...target, battleData: { ...target.battleData, position: dest } }), message: joinLines(messages, "; ") };
  }

  if (mode === "push") messages.push(textRef("battleActions.grapple.pushBlocked"));

  if (hasCondition(target, "prone")) return { participants, message: joinLines(messages, "; ") };

  const result = applyHeld(input, target, "prone", coreTimedKey("shove", actor.basicInfo.id));

  return { participants: result.participants, message: joinLines([...messages, ...result.messages], "; ") };
}

export function runEscape(input: Omit<GrappleActionInput, "targetId">): GrappleActionResult {
  const { actor, participants, rules } = input;

  const grapplerId = conditionSourceIds(actor, "grappled")[0];

  const name = actor.basicInfo.name;

  const grappler = grapplerId ? findParticipant(participants, grapplerId) : undefined;

  const spellDc = actor.battleData.activeEffects.find((e) => e.escapeDc && e.type === "condition" && e.effects[0]?.type === "grappled" && (!grapplerId || e.source?.participantId === grapplerId))?.escapeDc;

  const check = spellDc !== undefined ? escapeAgainstDc({ escaper: actor, dc: spellDc, participants, rules, rng: input.rng }) : grappler ? escapeContest({ escaper: actor, grappler, participants, rules, rng: input.rng }) : { success: true, message: "" as LogLine };

  const tail = check.message ? joinLines([" ", check.message]) : "";

  if (!check.success) return { participants, message: textRef("battleActions.grapple.escapeFail", { name, tail }) };

  const { participant } = removeEffects(actor, (e) => e.type === "condition" && e.effects[0]?.type === "grappled" && (!grapplerId || e.source?.participantId === grapplerId));

  return { participants: replaceParticipant(participants, participant), message: textRef("battleActions.grapple.escapeFree", { name, tail }) };
}

const isGrappleEffect = (e: BattleParticipant["battleData"]["activeEffects"][number]) => !!e.abilityKey?.startsWith(GRAPPLE_KEY_PREFIX);

function grapplerIds(p: BattleParticipant): Set<string> {
  const ids = new Set<string>();

  for (const { abilityKey } of p.battleData.activeEffects) if (abilityKey?.startsWith(GRAPPLE_KEY_PREFIX)) ids.add(abilityKey.slice(GRAPPLE_KEY_PREFIX.length));

  return ids;
}

/** Без захоплень повертає той самий масив. */
export function releaseInvalidGrapples(ps: BattleParticipant[], map?: BattleMapConfig | null): { participants: BattleParticipant[]; messages: LogLine[] } {
  const messages: LogLine[] = [];

  if (!ps.some((p) => p.battleData.activeEffects.some(isGrappleEffect))) return { participants: ps, messages };

  let next = ps;

  let byId = new Map(ps.map((p) => [p.basicInfo.id, p]));

  for (const target of ps) {
    for (const id of grapplerIds(target)) {
      const grappler = byId.get(id);

      const current = byId.get(target.basicInfo.id) ?? target;

      const gone = !grappler || !isActive(grappler) || hasCondition(grappler, "incapacitated");

      const apart = !!map && !!grappler && !!grappler.battleData.position && !!current.battleData.position && !isAdjacent(grappler, current);

      if (!gone && !apart) continue;

      const out = releaseGrapples(next, id, textRef(gone ? "battleActions.grapple.reasons.gone" : "battleActions.grapple.reasons.apart"), target.basicInfo.id);

      next = out.participants;
      byId = new Map(next.map((p) => [p.basicInfo.id, p]));
      messages.push(...out.messages);
    }
  }

  return { participants: next, messages };
}

export interface DragPlan {
  targets: { id: string; cell: GridPoint }[];
  blocked: string[];
}

/** Схоплені стають на клітинку шляху перед призначенням (або на стару клітинку схоплювача). */
export function planDrag(input: { map: BattleMapConfig; participants: BattleParticipant[]; mover: BattleParticipant; to: GridPoint; path: GridPoint[] | null }): DragPlan | null {
  const { map, participants, mover, to, path } = input;

  const start = mover.battleData.position;

  const grabbed = grappledBy(participants, mover.basicInfo.id).filter((t) => isActive(t) && t.battleData.position);

  if (!start || !grabbed.length || !path) return null;

  const cell = path.length > 1 ? path[path.length - 2] : start;

  const movedMover = { ...mover, battleData: { ...mover.battleData, position: to } };

  const moved = replaceParticipant(participants, movedMover);

  const plan: DragPlan = { targets: [], blocked: [] };

  let taken = moved;

  for (const t of grabbed) {
    const placed = { ...t, battleData: { ...t.battleData, position: cell } };

    const free = canStand(map, taken, t, cell);

    const adjacent = free && isAdjacent(movedMover, placed);

    if (adjacent) {
      plan.targets.push({ id: t.basicInfo.id, cell });
      taken = replaceParticipant(taken, placed);
    } else plan.blocked.push(t.basicInfo.id);
  }

  return plan;
}
