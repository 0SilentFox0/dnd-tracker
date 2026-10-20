import type { MazeConfig, MazeDifficulty } from "@/types/battle";

export const MAZE_STEPS_PER_TURN = 3;

export const MAZE_VISION_RANGE = 4;

export const MAZE_TELEPORT_MIN_DISTANCE = 5;

export const MAZE_SCATTER_MIN_GAP = 2;

export const MAZE_MAX_GENERATION_ATTEMPTS = 50;

export const MAZE_MARK_COLORS: string[] = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

export function emptyMaze(difficulty: MazeDifficulty = "medium"): MazeConfig {
  return { walls: [], exit: null, difficulty, teleports: [], fog: [], marks: {}, dark: false };
}
