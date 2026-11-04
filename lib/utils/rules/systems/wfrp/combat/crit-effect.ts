import type { CritResult } from "./crit-table";

import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { upsertLabeled } from "@/lib/utils/battle/actions/effects";
import { PERMANENT_ROUNDS } from "@/lib/utils/battle/conditions/registry";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function applyWfrpCrit(target: BattleParticipant, crit: CritResult, round: number): { participant: BattleParticipant; message: LogLine } {
  const message = crit.bonusDamage > 0 ? textRef("battleLog.wfrp.critHit", { target: target.basicInfo.name, text: dynamicTextRef(crit.textKey), bonus: crit.bonusDamage }) : textRef("battleLog.wfrp.critWound", { target: target.basicInfo.name, text: dynamicTextRef(crit.textKey) });

  if (!crit.markerKey) return { participant: target, message };

  const participant = upsertLabeled(
    target,
    {
      timedKey: `wfrp:crit:${crit.id}`,
      name: `crit.wfrp.${crit.id}.${crit.markerKey}`,
      label: dynamicTextRef(crit.textKey),
      type: "debuff",
      rounds: PERMANENT_ROUNDS,
      permanent: true,
      stackable: true,
      effects: [{ type: crit.markerKey, value: 1 }],
    },
    round,
  );

  return { participant, message };
}
