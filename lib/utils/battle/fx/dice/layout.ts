import type { DieSides } from "@/types/battle";

export const MAX_DICE = 12;

export const MAX_SAVES_SHOWN = 6;

const ROW_MAX = 6;

export interface DieSlot {
  sides: DieSides;
  value: number;
  chosen?: boolean;
  dropped?: boolean;
  row: number;
  col: number;
  rowLength: number;
}

type Die = Omit<DieSlot, "row" | "col" | "rowLength">;

export function layoutDice(groups: Die[][]): { slots: DieSlot[]; overflow: number } {
  const total = groups.reduce((a, g) => a + g.length, 0);

  let left = MAX_DICE;

  const rows: Die[][] = [];

  for (const group of groups) {
    const kept = group.slice(0, Math.max(0, left));

    left -= kept.length;

    for (let i = 0; i < kept.length; i += ROW_MAX) rows.push(kept.slice(i, i + ROW_MAX));
  }

  const slots = rows.flatMap((row, r) => row.map((die, c) => ({ ...die, row: r, col: c, rowLength: row.length })));

  return { slots, overflow: total - slots.length };
}
