import type { Unit } from "@/types/units";

export function getUnitImmunities(unit: Unit): string[] {
  return Array.isArray(unit.immunities) ? unit.immunities : [];
}
