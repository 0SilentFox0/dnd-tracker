import { attackShare, isEnemyOf, pickedEnemies, strikeAll, unchanged } from "./strike";
import type { ManeuverInput, ManeuverResult } from "./types";

import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { cellsOf, footprintDistance, isOnMap } from "@/lib/utils/battle/grid";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import { rollDie } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

const NO_MAP_TARGETS = 3;

export function fireBurst(ps: BattleParticipant[], input: ManeuverInput): ManeuverResult {
  const actor = findParticipant(ps, input.actorId);

  if (!actor) return unchanged(ps);

  const targets = input.map && isOnMap(actor)
    ? ps.filter((p) => isEnemyOf(actor)(p) && isOnMap(p) && footprintDistance(cellsOf(actor), cellsOf(p)) <= 1)
    : pickedEnemies(ps, actor, input.targetIds, NO_MAP_TARGETS);

  const full = attackShare(actor, ps, input.percentOfAttack, input.rng);

  const dc = spellSaveDc(actor);

  const notes = new Map<string, string>();

  const hits = targets.map((t) => {
    const roll = rollDie(20, input.rng);

    const total = roll + t.abilities.modifiers.dexterity;

    const saved = total >= dc;

    notes.set(t.basicInfo.id, ` (Спритність ${total} проти СК ${dc}${saved ? " — половина" : ""})`);

    return { targetId: t.basicInfo.id, amount: saved ? Math.floor(full / 2) : full };
  });

  return strikeAll(unchanged(ps), hits, { actorId: actor.basicInfo.id, damageType: "fire", name: input.name, note: (id) => notes.get(id) ?? "" });
}
