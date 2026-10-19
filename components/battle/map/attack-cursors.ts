import type { BattleMapView } from "@/types/battle";

type AttackKind = NonNullable<BattleMapView["trajectory"]>["kind"];

// контури lucide sword / bow-arrow; темна підкладка, щоб курсор читався на будь-якому фоні
const PATHS: Record<AttackKind, string[]> = {
  melee: ["m11 19-6-6", "m5 21-2-2", "m8 16-4 4", "M9.5 17.5 21 6V3h-3L6.5 14.5"],
  ranged: [
    "M17 3h4v4",
    "M18.575 11.082a13 13 0 0 1 1.048 9.027 1.17 1.17 0 0 1-1.914.597L14 17",
    "M7 10 3.29 6.29a1.17 1.17 0 0 1 .6-1.91 13 13 0 0 1 9.03 1.05",
    "M7 14a1.7 1.7 0 0 0-1.207.5l-2.646 2.646A.5.5 0 0 0 3.5 18H5a1 1 0 0 1 1 1v1.5a.5.5 0 0 0 .854.354L9.5 18.207A1.7 1.7 0 0 0 10 17v-2a1 1 0 0 0-1-1z",
    "M9.707 14.293 21 3",
  ],
};

function cursorSvg(paths: string[]): string {
  const layer = (stroke: string, width: number) => `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">${layer("#000", 4.5)}${layer("#f2c14e", 2)}</svg>`;
}

// гаряча точка — вістря (21, 3) у сітці 24 → (28, 4) у 32 px
export const ATTACK_CURSOR: Record<AttackKind, string> = {
  melee: `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(PATHS.melee))}") 28 4, pointer`,
  ranged: `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(PATHS.ranged))}") 28 4, pointer`,
};
