import { ACTION_SLOT } from "../slots";

import { textRef } from "@/lib/i18n/text-ref";
import { percentileDice } from "@/lib/utils/battle/fx/dice";
import type { RuleSystemActionDetails } from "@/lib/utils/rules/systems/types";
import type { LogLine } from "@/types/text";

const hideDefense = (line: LogLine): LogLine => {
  if (typeof line === "string" || line.message !== "battleLog.percentile.opposed") return line;

  const { roll, target, sl, netSl } = line.params ?? {};

  return textRef("battleLog.percentile.opposedHidden", { roll: roll ?? 0, target: target ?? 0, sl: sl ?? 0, netSl: netSl ?? 0 });
};

export const wfrpActionDetails: RuleSystemActionDetails = {
  redact(details, view) {
    const slot = ACTION_SLOT.read(details);

    if (!slot) return undefined;

    let { attack, cast } = slot;

    let changed = false;

    if (attack && view.hideNumbers) {
      attack = undefined;
      changed = true;
    }

    if (attack?.defender) {
      const { defender: _defender, ...rest } = attack;

      attack = rest;
      changed = true;
    }

    if (cast?.miscast && view.hideActor) {
      cast = { ...cast, miscast: null };
      changed = true;
    }

    if (!attack && !cast) return undefined;

    return changed ? ACTION_SLOT.write({ ...(attack && { attack }), ...(cast && { cast }) }) : details;
  },

  actorSecret: (details) => !!ACTION_SLOT.read(details)?.cast?.miscast,

  redactLine: hideDefense,

  diceFx(details) {
    const attack = ACTION_SLOT.read(details)?.attack;

    return attack ? percentileDice(attack.roll) : [];
  },

  failed(details) {
    const outcome = ACTION_SLOT.read(details)?.cast?.outcome;

    return outcome === "failure" || outcome === "fumble";
  },
};
