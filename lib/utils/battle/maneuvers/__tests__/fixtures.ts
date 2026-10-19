import { dive, fireBurst, squall } from "@/data/library/unit-abilities";
import { ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { resolveAmount } from "@/lib/utils/abilities/engine/core/amount";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { byId, CLAWS, hpOf, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export const MAP: BattleMapConfig = testMap(20);

export const ABILITIES = { dive: resolved(dive(), { type: "unit", id: "g" }), squall: resolved(squall(), { type: "unit", id: "g" }), fireBurst: resolved(fireBurst(), { type: "unit", id: "g" }) };

export const unit = placed;

export const griffin = (ability: keyof typeof ABILITIES, at?: GridPoint) => unit("g", { side: ParticipantSide.ALLY, at, abilities: [ABILITIES[ability]] });

export const percentOfAttack = (owner: BattleParticipant, value: number) => resolveAmount({ percentOf: "ownerAttack", value }, { owner, rng: () => 0, participants: [owner] });

export const hp = hpOf;

export { byId, CLAWS };

export function perform(ps: BattleParticipant[], ability: keyof typeof ABILITIES, opts: { targetIds?: string[]; targetCell?: GridPoint; map?: BattleMapConfig; rng?: Rng; round?: number } = {}) {
  return runAbilities(
    ps,
    { type: "action", actorId: "g", abilityKey: ABILITIES[ability].key, targetIds: opts.targetIds ?? [], ...(opts.targetCell && { targetCell: opts.targetCell }) },
    { round: opts.round ?? 1, rng: opts.rng ?? (() => 0), ...(opts.map && { map: opts.map }) },
  );
}
