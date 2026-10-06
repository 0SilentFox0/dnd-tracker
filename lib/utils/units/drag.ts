import type { Unit } from "@/types/units";

export const UNIT_DRAG_TYPE = "application/x-unit-id";

export interface UnitDragPayload {
  unitId: string;
  raceId: string | null;
  level: number;
}

export type UnitDropTarget = { raceId: string | null } | { level: number };

export function unitDragPayload(unit: Pick<Unit, "id" | "raceId" | "level">): string {
  return JSON.stringify({ unitId: unit.id, raceId: unit.raceId ?? null, level: unit.level });
}

export function parseUnitDragPayload(raw: string): UnitDragPayload | null {
  try {
    const p = JSON.parse(raw) as Partial<UnitDragPayload> | null;

    if (typeof p?.unitId !== "string" || !p.unitId) return null;

    return { unitId: p.unitId, raceId: typeof p.raceId === "string" ? p.raceId : null, level: typeof p.level === "number" ? p.level : 1 };
  } catch {
    return null;
  }
}

export function planUnitDrop(payload: UnitDragPayload, target: UnitDropTarget): Partial<Unit> | null {
  if ("level" in target) return payload.level === target.level ? null : { level: target.level };

  return payload.raceId === target.raceId ? null : { raceId: target.raceId };
}
