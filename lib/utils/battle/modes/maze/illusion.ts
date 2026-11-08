import { onMazeField } from "./status";
import { MAZE_TEXTS } from "./texts";

import { BattleStatus } from "@/lib/constants/battle";
import { dmEvent } from "@/lib/utils/battle/store/event-mapping";
import type { NewBattleEvent, ScenePatch } from "@/lib/utils/battle/store/types";
import type { BattleMapConfig, BattleParticipant, IllusionDisguise, IllusionPair, MazeConfig } from "@/types/battle";
import type { LogLine } from "@/types/text";


export const illusionPairs = (maze: MazeConfig | null | undefined): IllusionPair[] => maze?.illusionSwap?.pairs ?? [];

export const illusionPartner = (pairs: IllusionPair[], id: string): IllusionPair | undefined => pairs.find((p) => p.a === id || p.b === id);

export const areIllusionFoes = (pairs: IllusionPair[], aId: string, bId: string): boolean =>
  aId !== bId && pairs.some((p) => (p.a === aId && p.b === bId) || (p.a === bId && p.b === aId));

/** маска для глядача `viewerId`: ким він бачить `targetId` (undefined — справжнім) */
export const disguiseFor = (pairs: IllusionPair[], viewerId: string, targetId: string): IllusionDisguise | undefined => {
  for (const p of pairs) {
    if (p.a === viewerId && p.b === targetId) return p.aSees;

    if (p.b === viewerId && p.a === targetId) return p.bSees;
  }

  return undefined;
};

// подія потрібна, щоб зміну лабіринту можна було відкотити (знімок пишеться лише з подією)
export function mazeOpEvent(round: number, text: LogLine, kind: "op" | "reshuffle"): NewBattleEvent {
  const event = dmEvent(round, text);

  return { ...event, details: { ...event.details, actionDetails: { mazeEvent: kind } } };
}

interface PruneOutcome {
  participants: BattleParticipant[];
  events?: NewBattleEvent[];
  scene?: ScenePatch;
}

/** Знімає пари, де хтось загинув, пішов з мапи, або бій уже не активний. */
export function pruneIllusion<T extends PruneOutcome>(map: BattleMapConfig | null, scene: { status: BattleStatus; round: number }, result: T): T {
  const pairs = illusionPairs(map?.maze);

  if (!map?.maze || pairs.length === 0) return result;

  const active = (result.scene?.status ?? scene.status) === BattleStatus.ACTIVE;

  const live = new Set(result.participants.filter(onMazeField).map((p) => p.basicInfo.id));

  const kept = active ? pairs.filter((p) => live.has(p.a) && live.has(p.b)) : [];

  if (kept.length === pairs.length) return result;

  const next: MazeConfig = { ...map.maze, illusionSwap: { pairs: kept } };

  return {
    ...result,
    scene: { ...result.scene, map: { ...map, maze: next } },
    events: [...(result.events ?? []), mazeOpEvent(result.scene?.round ?? scene.round, MAZE_TEXTS.ops.illusionAuto, "op")],
  };
}
