import { calculateInitiative, compareInitiative } from "./initiative";

import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { rollDie } from "@/lib/utils/common/dice";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { BattleParticipant } from "@/types/battle";

export interface InitiativeRollEntry {
  id: string;
  d20: number;
  total: number;
}

const ROLL_RULES = { initiative: { ...DEFAULT_RULES.initiative, mode: "roll" as const } };

/** Rolls d20 + modifiers for everyone and sorts; pinned (always-first) participants keep their static value. */
export function rollInitiative(participants: BattleParticipant[], rng: Rng): { participants: BattleParticipant[]; rolls: InitiativeRollEntry[] } {
  const all = participants.filter((p) => !p.basicInfo.isExtraTurnSlot);

  const rolls: InitiativeRollEntry[] = [];

  const scored = all.map((p) => {
    let raw: number | null = null;

    const total = calculateInitiative(p, all, {
      rules: ROLL_RULES,
      rng: () => {
        raw ??= rng();

        return raw;
      },
    });

    if (raw !== null) rolls.push({ id: p.basicInfo.id, d20: rollDie(20, () => raw as number), total });

    const { revealPending: _dropped, ...battleData } = p.battleData;

    return { p: { ...p, battleData, abilities: { ...p.abilities, initiative: total } }, key: 0 };
  });

  for (const s of scored) s.key = rng();

  scored.sort((a, b) => compareInitiative(a.p, b.p) || a.key - b.key);

  return { participants: scored.map((s) => s.p), rolls };
}
