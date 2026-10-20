import { expect } from "vitest";

import { emptyMaze } from "@/lib/constants/battle";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleMapConfig, BattleParticipant, GridPoint, MazeConfig } from "@/types/battle";

type BattleData = Partial<BattleParticipant["battleData"]>;

export const mazeOf = (over: Partial<MazeConfig> = {}): MazeConfig => ({ ...emptyMaze(), ...over });

export const mazeMap = (over: Partial<MazeConfig> = {}, cols = 8, rows = cols): BattleMapConfig => testMap(cols, rows, { maze: mazeOf(over) });

export const mazeGrid = (over: Partial<MazeConfig> = {}, cols = 8, rows = cols) => ({ cols, rows, maze: mazeOf(over) });

export const flag = (p: BattleParticipant, data: BattleData): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...data } });

export const at = (p: BattleParticipant, position: GridPoint, extra: BattleData = {}): BattleParticipant => flag(p, { position, ...extra });

export const withMap = <T extends { meta: object }>(ctx: T, map: BattleMapConfig | null): T => ({ ...ctx, meta: { ...ctx.meta, map } });

export const expectRejected = (fn: () => unknown, message?: string) => expect(fn).toThrow(expect.objectContaining({ code: "action_rejected", ...(message && { message }) }));
