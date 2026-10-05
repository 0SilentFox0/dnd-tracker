import type { LegacyEffect } from "./types";

const PERCENT_DAMAGE_KEYS = ["melee_damage", "ranged_damage", "counter_damage"];

type RawEffect = {
  stat?: string;
  type?: string;
  value?: number | string | boolean;
  duration?: number;
  target?: string;
  maxTriggers?: number | null;
  isPercentage?: boolean;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseLegacyEffects(combatStats: unknown, bonuses: unknown): LegacyEffect[] {
  const raw = isRecord(combatStats) && Array.isArray(combatStats.effects) ? (combatStats.effects as RawEffect[]) : [];

  if (raw.length > 0) {
    return raw
      .filter((e) => isRecord(e) && (e.stat || e.type))
      .map((e) => ({
        stat: e.stat || e.type || "",
        type: e.type || "flat",
        value: e.value ?? 0,
        isPercentage: e.isPercentage === true || e.type === "percent" || e.type === "percentage",
        ...(e.duration !== undefined && { duration: e.duration }),
        ...(e.target != null && { target: e.target }),
        ...(e.maxTriggers != null && { maxTriggers: e.maxTriggers }),
      }));
  }

  if (!isRecord(bonuses)) return [];

  return Object.entries(bonuses)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => {
      const pct = PERCENT_DAMAGE_KEYS.includes(key) || key.includes("percent");

      return { stat: key, type: pct ? "percent" : "flat", value: value as number, isPercentage: pct };
    });
}
