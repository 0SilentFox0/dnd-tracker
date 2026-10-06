export const RACE_COLOR_PALETTE = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"] as const;

export function raceColorAt(index: number): string {
  return RACE_COLOR_PALETTE[((index % RACE_COLOR_PALETTE.length) + RACE_COLOR_PALETTE.length) % RACE_COLOR_PALETTE.length];
}
