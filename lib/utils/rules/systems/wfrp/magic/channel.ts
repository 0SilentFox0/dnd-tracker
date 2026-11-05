import { skillTarget, value } from "../characteristics/derive";
import { readCharacteristics } from "../characteristics/keys";
import { selfTestMod } from "../conditions/test-mod";
import { resolvePercentileTest } from "../percentile";
import { CHANNEL_MAX_SL } from "./constants";

import { textRef } from "@/lib/i18n/text-ref";
import type { Rng } from "@/lib/utils/common/rng";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const WORST_ROLL = 100;

export function channelTargetOf(p: BattleParticipant): number {
  const chars = readCharacteristics({ characteristics: p.abilities.characteristics });

  return (skillTarget(chars, "channelling")?.target ?? value(chars, "wp")) + selfTestMod(p, "test");
}

export function wfrpChannel(p: BattleParticipant, ctx: { rules: Ruleset; rng: Rng; presetRoll?: number }): { participant: BattleParticipant; lines: LogLine[]; miscast: "minor" | "major" | null } {
  const target = channelTargetOf(p);

  const test = resolvePercentileTest({ target, rng: ctx.rng, presetRoll: ctx.presetRoll });

  const success = test.outcome === "success" || test.outcome === "critical";

  const miscast = test.roll === WORST_ROLL ? "minor" : null;

  const banked = success ? Math.min(CHANNEL_MAX_SL, (p.battleData.channelledSl ?? 0) + Math.max(0, test.sl)) : (p.battleData.channelledSl ?? 0);

  const participant = success ? { ...p, battleData: { ...p.battleData, channelledSl: banked } } : p;

  const line = textRef(success ? "wfrpMagic.log.channelSuccess" : "wfrpMagic.log.channelFail", { name: p.basicInfo.name, roll: test.roll, target: test.target, sl: test.sl, banked });

  return { participant, lines: [line], miscast };
}
