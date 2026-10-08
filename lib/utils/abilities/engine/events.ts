import type { DamageKind } from "@/lib/utils/abilities/schema";
import type { AbilityEvent } from "@/types/abilities";

export function eventActorId(e: AbilityEvent): string | null {
  return "actorId" in e ? e.actorId : null;
}

export function eventTargetIds(e: AbilityEvent): string[] {
  switch (e.type) {
    case "attack":
    case "hit":
    case "kill":
    case "lethalDamage":
      return [e.targetId];
    case "spellCast":
      return e.targetIds;
    case "bonusAction":
    case "action":
      return e.targetIds?.length ? e.targetIds : [e.actorId];
    default:
      return [];
  }
}

export function eventAttackKind(e: AbilityEvent | null): DamageKind | null {
  if (!e) return null;

  if (e.type === "attack" || e.type === "hit") return e.attackKind;

  return e.type === "spellCast" ? "magic" : null;
}

export function eventSpellRoll(e: AbilityEvent): number | undefined {
  return e.type === "spellCast" ? e.roll : undefined;
}

export function eventDamage(e: AbilityEvent): number | undefined {
  return e.type === "hit" ? e.damage : undefined;
}
