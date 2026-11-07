import { skillTarget, value } from "../characteristics/derive";
import { readCharacteristics } from "../characteristics/keys";
import { applyWfrpCondition } from "../conditions/apply";
import { selfTestMod } from "../conditions/test-mod";
import { resolvePercentileTest } from "../percentile";
import { PSYCHOLOGY_PASS_SL } from "./constants";
import { traitEffects } from "./read";

import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { inPlay, resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/core/participants";
import type { PsychologyKind } from "@/lib/utils/abilities/schema/kinds";
import type { Rng } from "@/lib/utils/common/rng";
import type { SystemConditionResult } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

interface Threat {
  kind: PsychologyKind;
  value: number;
  source: BattleParticipant;
}

function psychologyOf(p: BattleParticipant): { kind: PsychologyKind; value: number }[] {
  return traitEffects(resolvedAbilitiesOf(p)).flatMap((e) => (e.kind === "wfrpPsychology" ? [{ kind: e.psychology, value: e.value }] : []));
}

function threatOf(source: BattleParticipant): Threat | null {
  const all = psychologyOf(source);

  const kind: PsychologyKind | null = all.some((x) => x.kind === "terror") ? "terror" : all.length > 0 ? "fear" : null;

  return kind ? { kind, value: Math.max(...all.filter((x) => x.kind === kind).map((x) => x.value)), source } : null;
}

const stronger = (a: Threat, b: Threat | null) => !b || (a.kind === "terror" ? b.kind !== "terror" || a.value > b.value : b.kind !== "terror" && a.value > b.value);

const isImmune = (ps: BattleParticipant[], id: string) => findFlags(ps, id, "conditionImmunity").some((f) => f.conditions === "all" || (f.conditions as string[]).includes("fear"));

export function wfrpPsychology(ps: BattleParticipant[], ctx: { round: number; rng: Rng; newcomerIds?: readonly string[] }): SystemConditionResult & { testerIds: string[] } {
  const fresh = ctx.newcomerIds ? new Set(ctx.newcomerIds) : null;

  const threats = ps.filter(inPlay).flatMap((p) => threatOf(p) ?? []);

  let participants = ps;

  const messages: LogLine[] = [];

  const testerIds: string[] = [];

  for (const tester of ps) {
    if (!inPlay(tester) || psychologyOf(tester).length > 0 || isImmune(ps, tester.basicInfo.id)) continue;

    const isNew = !fresh || fresh.has(tester.basicInfo.id);

    const top = threats
      .filter((t) => t.source.basicInfo.side !== tester.basicInfo.side && (isNew || !!fresh?.has(t.source.basicInfo.id)))
      .reduce<Threat | null>((best, t) => (stronger(t, best) ? t : best), null);

    const done = tester.battleData.psychologyTested ?? {};

    if (!top || top.value <= (done[top.kind] ?? 0)) continue;

    testerIds.push(tester.basicInfo.id);

    const c = readCharacteristics({ characteristics: tester.abilities.characteristics });

    const target = (skillTarget(c, "cool")?.target ?? value(c, "wp")) + selfTestMod(tester, "test");

    const run = (kind: PsychologyKind): { passed: boolean; sl: number } => {
      const t = resolvePercentileTest({ target, rng: ctx.rng });

      const passed = (t.outcome === "success" || t.outcome === "critical") && t.sl >= PSYCHOLOGY_PASS_SL(top.value);

      messages.push(textRef(passed ? "battleWfrp.log.psychologyPass" : "battleWfrp.log.psychologyFail", { name: tester.basicInfo.name, source: top.source.basicInfo.name, kind: dynamicTextRef(`battleWfrp.psychology.${kind}`), value: top.value, roll: t.roll, target, sl: t.sl }));

      return { passed, sl: t.sl };
    };

    const breakBy = (levels: number) => {
      const r = applyWfrpCondition(participants, tester.basicInfo.id, { key: "broken", levels, round: ctx.round, sourceName: top.source.basicInfo.name });

      participants = r.participants;
      messages.push(...r.messages);
    };

    if (top.kind === "terror") {
      const terror = run("terror");

      if (!terror.passed) breakBy(1 + Math.max(0, -terror.sl));

      if (!run("fear").passed) breakBy(1);
    } else if (!run("fear").passed) breakBy(1);

    const tested = { ...done, [top.kind]: top.value, ...(top.kind === "terror" && { fear: Math.max(done.fear ?? 0, top.value) }) };

    participants = participants.map((p) => (p.basicInfo.id === tester.basicInfo.id ? { ...p, battleData: { ...p.battleData, psychologyTested: tested } } : p));
  }

  return { participants, messages, testerIds };
}
