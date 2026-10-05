import type { Unit } from "@/types/units";

export type QuickStatField = "ac" | "init" | "dice";

export type QuickStatPlan = { kind: "reset" } | { kind: "noop" } | { kind: "update"; data: Partial<Unit> };

export function parseQuickStatInt(raw: string): number | null {
  const t = raw.trim();

  if (t === "") return null;

  const n = Number.parseInt(t, 10);

  return Number.isFinite(n) ? n : null;
}

export function planQuickStatUpdate(field: QuickStatField, raw: string, unit: Unit, primaryAttackIndex: number): QuickStatPlan {
  if (field === "dice") {
    const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

    const primary = primaryAttackIndex >= 0 ? attacks[primaryAttackIndex] : undefined;

    const trimmed = raw.trim();

    if (!primary || trimmed === (primary.damageDice ?? "").trim()) return { kind: "noop" };

    if (!trimmed) return { kind: "reset" };

    return { kind: "update", data: { attacks: attacks.map((a, i) => (i === primaryAttackIndex ? { ...a, damageDice: trimmed } : a)) } };
  }

  const n = parseQuickStatInt(raw);

  if (n === null) return { kind: "reset" };

  if (field === "ac") {
    const ac = Math.max(0, n);

    return ac === unit.armorClass ? { kind: "noop" } : { kind: "update", data: { armorClass: ac } };
  }

  return n === unit.initiative ? { kind: "noop" } : { kind: "update", data: { initiative: n } };
}
