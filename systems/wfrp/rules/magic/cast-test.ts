import { skillTarget, value } from "../characteristics/derive";
import { readCharacteristics } from "../characteristics/keys";
import { selfTestMod } from "../conditions/test-mod";
import { type PercentileTestResult, resolvePercentileTest } from "../percentile";
import { applyFortune } from "../percentile/fortune";
import { armourSl } from "./armour";
import { CAST_SKILL, MAJOR_MISCAST_ROLLS, MAX_OVERCAST_STEPS, NO_OVERCAST_KINDS, OVERCAST_SL_STEP, PRAY_SKILL, PRAYER_KINDS } from "./constants";

import { textRef } from "@/lib/i18n/text-ref";
import type { CastTestCtx, CastTestResult } from "@/lib/utils/rules/systems/types";
import type { SpellMagicKind } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

export function castTargetOf(caster: BattleParticipant): number {
  const chars = readCharacteristics({ characteristics: caster.abilities.characteristics });

  return (skillTarget(chars, CAST_SKILL.key, CAST_SKILL.spec)?.target ?? value(chars, "int")) + selfTestMod(caster, "test");
}

export function prayTargetOf(caster: BattleParticipant): number {
  const chars = readCharacteristics({ characteristics: caster.abilities.characteristics });

  return (skillTarget(chars, PRAY_SKILL.key)?.target ?? value(chars, "fel")) + selfTestMod(caster, "test");
}

export const isPrayerKind = (kind: SpellMagicKind | undefined): boolean => kind !== undefined && PRAYER_KINDS.has(kind);

export function wfrpCastTest(ctx: CastTestCtx): CastTestResult {
  const { caster, spell, magic, rng, presetRoll } = ctx;

  const prayer = isPrayerKind(magic.kind);

  const target = prayer ? prayTargetOf(caster) : castTargetOf(caster);

  const channelled = prayer ? 0 : (caster.battleData.channelledSl ?? 0);

  const armour = prayer ? 0 : armourSl(caster);

  const cn = magic.kind === "blessing" ? 0 : magic.cn;

  const slModifier = channelled - armour + (ctx.fortune?.kind === "sl" ? 1 : 0);

  const passes = (t: PercentileTestResult) => (t.outcome === "success" || t.outcome === "critical") && t.sl >= cn;

  const { result: test, fortune } = applyFortune((preset) => resolvePercentileTest({ target, slModifier, doubles: true, rng, presetRoll: preset }), ctx.fortune, passes, presetRoll);

  const success = passes(test);

  const critical = success && test.outcome === "critical";

  const sin = caster.battleData.sin ?? 0;

  const wrath = test.doubles && sin > 0 && test.roll % 10 <= sin;

  const miscast = prayer ? (wrath ? "wrath" : null) : MAJOR_MISCAST_ROLLS.has(test.roll) ? "major" : test.doubles ? "minor" : null;

  const overcastSteps = success && magic.overcast !== null && !NO_OVERCAST_KINDS.has(magic.kind) ? Math.min(MAX_OVERCAST_STEPS, Math.max(0, Math.floor((test.sl - cn) / OVERCAST_SL_STEP))) : 0;

  const outcome = success ? (critical ? "critical" : "success") : test.outcome === "fumble" ? "fumble" : "failure";

  const params = { name: caster.basicInfo.name, spell: spell.name, roll: test.roll, target: test.target, sl: test.sl, cn };

  const lines = [textRef(critical ? "wfrpMagic.log.castCritical" : success ? "wfrpMagic.log.castSuccess" : "wfrpMagic.log.castFail", params)];

  if (fortune) lines.push(textRef(fortune.kind === "reroll" ? "battleWfrp.log.fortuneReroll" : "battleWfrp.log.fortuneSl", { name: caster.basicInfo.name, first: fortune.firstRoll ?? 0 }));

  return {
    success,
    sl: test.sl,
    overcastSteps,
    miscast,
    ...(prayer && { keepChannelled: true as const }),
    percentile: { roll: test.roll, target: test.target, sl: test.sl, cn, channelled, armourSl: armour, doubles: test.doubles, outcome, overcastSteps, miscast, ...(fortune && { fortune }) },
    lines,
    ...(fortune && { fortune }),
  };
}
