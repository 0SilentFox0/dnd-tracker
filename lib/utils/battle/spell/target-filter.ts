import { upcastSteps } from "@/lib/utils/battle/spell/caster-dice";
import type { SpellTargetFilter } from "@/lib/utils/spells/model/schema";
import type { BattleParticipant } from "@/types/battle";

const norm = (s: string) => s.trim().toLowerCase();

export function matchesTargetFilter(p: BattleParticipant, filter: SpellTargetFilter | undefined, level: { spellLevel: number; castLevel?: number }): boolean {
  if (!filter) return true;

  const { creatureTypes, maxCr, maxCrPerLevel, movement } = filter;

  const type = p.abilities.creatureType;

  if (creatureTypes && (!type || !creatureTypes.some((t) => norm(t) === norm(type)))) return false;

  if (maxCr !== undefined || maxCrPerLevel !== undefined) {
    const cr = p.abilities.cr;

    const steps = level.castLevel === undefined ? 0 : upcastSteps(level.spellLevel, level.castLevel);

    if (cr === undefined || cr > (maxCr ?? 0) + (maxCrPerLevel ?? 0) * steps) return false;
  }

  if (movement === "fly" && !((p.battleData.movement?.fly ?? 0) > 0)) return false;

  return true;
}
