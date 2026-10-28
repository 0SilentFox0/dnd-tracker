import { attackShare, isEnemyOf, maneuverResult,pickedEnemies, strikeAll } from "./strike";
import type { ManeuverInput, ManeuverResult } from "./types";

import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { cellsOf, footprintDistance, isOnMap } from "@/lib/utils/battle/grid";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import { spellSaveDc } from "@/lib/utils/battle/spell/power";
import type { BattleParticipant } from "@/types/battle";

export function fireBurst(ps: BattleParticipant[], input: ManeuverInput): ManeuverResult {
  const actor = findParticipant(ps, input.actorId);

  if (!actor) return maneuverResult(ps);

  const targets = input.map && isOnMap(actor)
    ? ps.filter((p) => isEnemyOf(actor)(p) && isOnMap(p) && footprintDistance(cellsOf(actor), cellsOf(p)) <= 1)
    : pickedEnemies(ps, actor, input.targetIds, input.maxTargets ?? input.targetIds.length);

  if (!targets.length) return { ...maneuverResult(ps), messages: [`🔥 ${input.name}: ${actor.basicInfo.name} — поруч нікого`] };

  const full = attackShare(actor, ps, input.percentOfAttack, input.rng);

  const dc = spellSaveDc(actor);

  const notes = new Map<string, string>();

  const hits = targets.map((t) => {
    const { total, success: saved } = rollSave({ target: t, ability: "dexterity", dc, participants: ps, rules: input.rules, rng: input.rng });

    notes.set(t.basicInfo.id, ` (Спритність ${total} проти СК ${dc}${saved ? " — половина" : ""})`);

    return { targetId: t.basicInfo.id, amount: saved ? Math.floor(full / 2) : full };
  });

  return strikeAll(maneuverResult(ps), hits, { actorId: actor.basicInfo.id, damageType: "fire", name: input.name, rules: input.rules, rng: input.rng, note: (id) => notes.get(id) ?? "" });
}
