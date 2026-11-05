import { skillTarget, value } from "../characteristics/derive";
import { readCharacteristics } from "../characteristics/keys";
import { selfTestMod } from "../conditions/test-mod";
import { type PercentileTestResult, resolvePercentileTest } from "../percentile";
import { applyFortune } from "../percentile/fortune";
import { armourSl } from "./armour";
import { CAST_SKILL, NO_OVERCAST_KINDS, OVERCAST_SL_STEP } from "./constants";

import { textRef } from "@/lib/i18n/text-ref";
import type { CastTestCtx, CastTestResult } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

export function castTargetOf(caster: BattleParticipant): number {
  const chars = readCharacteristics({ characteristics: caster.abilities.characteristics });

  return (skillTarget(chars, CAST_SKILL.key, CAST_SKILL.spec)?.target ?? value(chars, "int")) + selfTestMod(caster, "test");
}

const MAJOR_MISCAST_ROLLS = new Set([99, 100]);

export function wfrpCastTest(ctx: CastTestCtx): CastTestResult {
  const { caster, spell, magic, rng, presetRoll } = ctx;

  const target = castTargetOf(caster);

  const channelled = caster.battleData.channelledSl ?? 0;

  const armour = armourSl(caster);

  const slModifier = channelled - armour + (ctx.fortune?.kind === "sl" ? 1 : 0);

  const passes = (t: PercentileTestResult) => t.outcome === "critical" || ((t.outcome === "success") && t.sl >= magic.cn);

  const { result: test, fortune } = applyFortune((preset) => resolvePercentileTest({ target, slModifier, doubles: true, rng, presetRoll: preset }), ctx.fortune, passes, presetRoll);

  const success = passes(test);

  const critical = success && test.outcome === "critical";

  const miscast = MAJOR_MISCAST_ROLLS.has(test.roll) ? "major" : test.doubles ? "minor" : null;

  const overcastSteps = success && magic.overcast !== null && !NO_OVERCAST_KINDS.has(magic.kind) ? Math.max(0, Math.floor((test.sl - magic.cn) / OVERCAST_SL_STEP)) : 0;

  const outcome = success ? (critical ? "critical" : "success") : test.outcome === "fumble" ? "fumble" : "failure";

  const params = { name: caster.basicInfo.name, spell: spell.name, roll: test.roll, target: test.target, sl: test.sl, cn: magic.cn };

  const lines = [textRef(critical ? "wfrpMagic.log.castCritical" : success ? "wfrpMagic.log.castSuccess" : "wfrpMagic.log.castFail", params)];

  if (fortune) lines.push(textRef(fortune.kind === "reroll" ? "battleWfrp.log.fortuneReroll" : "battleWfrp.log.fortuneSl", { name: caster.basicInfo.name, first: fortune.firstRoll ?? 0 }));

  return {
    success,
    sl: test.sl,
    overcastSteps,
    miscast,
    percentile: { roll: test.roll, target: test.target, sl: test.sl, cn: magic.cn, channelled, armourSl: armour, doubles: test.doubles, outcome, overcastSteps, miscast, ...(fortune && { fortune }) },
    lines,
    ...(fortune && { fortune }),
  };
}
