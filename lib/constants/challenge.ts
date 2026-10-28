import { getProficiencyBonus } from "@/lib/utils/common/calculations";

const XP_BY_CR: ReadonlyArray<readonly [number, number]> = [
  [0, 10], [0.125, 25], [0.25, 50], [0.5, 100],
  [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300], [7, 2900], [8, 3900], [9, 5000], [10, 5900],
  [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000], [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000],
  [21, 33000], [22, 41000], [23, 50000], [24, 62000], [25, 75000], [26, 90000], [27, 105000], [28, 120000], [29, 135000], [30, 155000],
];

const XP_MAP = new Map(XP_BY_CR);

const FRACTIONS: Record<string, string> = { "0.125": "1/8", "0.25": "1/4", "0.5": "1/2" };

export const CHALLENGE_RATINGS: readonly number[] = XP_BY_CR.map(([cr]) => cr);

export const isChallengeRating = (v: number): boolean => XP_MAP.has(v);

export function xpForChallenge(cr: number): number {
  return XP_MAP.get(cr) ?? 0;
}

export function proficiencyForChallenge(cr: number): number {
  return getProficiencyBonus(Math.max(1, Math.ceil(cr)));
}

export function challengeLabel(cr: number): string {
  return FRACTIONS[String(cr)] ?? String(cr);
}

export const CHALLENGE_OPTIONS = CHALLENGE_RATINGS.map((cr) => ({ value: String(cr), label: challengeLabel(cr) }));
