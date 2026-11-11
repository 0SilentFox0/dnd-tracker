import { compareInitiative, scoreInitiative } from "./initiative";

import { isObject } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { dropBattleFlag } from "@/lib/utils/battle/participant/reserve";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";

export interface InitiativeRollEntry {
  id: string;
  roll: number;
  sides: number;
  total: number;
}

const rollRules = (rules: Ruleset = DEFAULT_RULES) => ({ ...rules, initiative: { ...rules.initiative, mode: "roll" as const } });

/** Rolls the system initiative (d20 + modifiers by default) for everyone and sorts; pinned (always-first) participants keep their static value. */
export function rollInitiative(participants: BattleParticipant[], rng: Rng, rules?: Ruleset): { participants: BattleParticipant[]; rolls: InitiativeRollEntry[] } {
  const all = participants.filter((p) => !p.basicInfo.isExtraTurnSlot);

  const objects = all.filter(isObject);

  const rollers = all.filter((p) => !isObject(p));

  const rolls: InitiativeRollEntry[] = [];

  const scored = rollers.map((p) => {
    let raw: number | null = null;

    const score = scoreInitiative(p, all, {
      rules: rollRules(rules),
      rng: () => {
        raw ??= rng();

        return raw;
      },
    });

    const { total } = score;

    if (score.roll !== null) rolls.push({ id: p.basicInfo.id, roll: score.roll, sides: score.die ?? 20, total });

    return { p: { ...dropBattleFlag(p, "revealPending"), abilities: { ...p.abilities, initiative: total } }, key: 0 };
  });

  for (const s of scored) s.key = rng();

  scored.sort((a, b) => compareInitiative(a.p, b.p) || a.key - b.key);

  return { participants: [...scored.map((s) => s.p), ...objects], rolls };
}
