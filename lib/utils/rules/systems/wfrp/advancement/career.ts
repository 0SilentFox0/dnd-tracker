import type { CareerState, Characteristics, LedgerEntry } from "../characteristics/keys";
import type { AdvancementRules } from "./rules";

export type CareerTierDef = { name: string; status?: string; characteristics: string[]; skills: string[]; talents: string[]; trappings: string[] };

export type CareerCtx = { state: CareerState; tiers: CareerTierDef[] };

export type CareerAdvanceResult = { ok: true; next: Characteristics } | { ok: false; error: "NO_CAREER" | "MAX_TIER" | "TICKS_MISSING" };

export const tickKey = (kind: LedgerEntry["kind"], key: string) => `${kind}:${key}`;

export function inCareer(ctx: CareerCtx, kind: LedgerEntry["kind"], key: string): boolean {
  const tier = ctx.tiers[ctx.state.tier - 1];

  if (!tier) return false;

  const list = kind === "characteristic" ? tier.characteristics : kind === "skill" ? tier.skills : tier.talents;

  return list.includes(key) || (kind === "skill" && list.includes(key.split(":")[0]));
}

export const planCareerSet = (c: Characteristics, careerId: string): Characteristics => ({ ...c, career: { careerId, tier: 1, ticks: [] } });

export function planCareerAdvance(c: Characteristics, rules: AdvancementRules, opts: { force: boolean }): CareerAdvanceResult {
  const career = c.career;

  if (!career) return { ok: false, error: "NO_CAREER" };

  if (career.tier === 4) return { ok: false, error: "MAX_TIER" };

  if (!opts.force && career.ticks.length < rules.career.ticksRequired[career.tier - 1]) return { ok: false, error: "TICKS_MISSING" };

  return { ok: true, next: { ...c, career: { ...career, tier: (career.tier + 1) as CareerState["tier"], ticks: [] } } };
}

export type CareerPrice = { cost: number; outOfCareer: number | null };

export function careerPrice(ctx: CareerCtx | undefined, rules: AdvancementRules, kind: LedgerEntry["kind"], key: string, base: number): CareerPrice {
  if (!ctx || inCareer(ctx, kind, key)) return { cost: base, outOfCareer: null };

  return { cost: Math.round(base * rules.career.outOfCareerMultiplier), outOfCareer: rules.career.outOfCareerMultiplier };
}
