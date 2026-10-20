import { type MazeGrid, mazeGridOf } from "./grid";
import { inMazePlay, isDormant, isMazeHero, isPlaced, type PlacedParticipant } from "./status";
import { mazeVision, seesParticipant, viewpointOf } from "./vision";

import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { actorEvent, systemEvent } from "@/lib/utils/battle/store/event-mapping";
import type { NewBattleEvent, ScenePatch } from "@/lib/utils/battle/store/types";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export interface AwarenessResult {
  participants: BattleParticipant[];
  events: NewBattleEvent[];
}

export interface AwarenessArgs {
  participants: BattleParticipant[];
  round: number;
  sleep: boolean;
}

interface Watcher {
  hero: BattleParticipant;
  position: GridPoint;
  vision: ReadonlySet<string>;
}

const isFieldEnemy = (p: BattleParticipant): p is PlacedParticipant => p.basicInfo.side === ParticipantSide.ENEMY && isPlaced(p) && !p.battleData.reserved && isActive(p);

const isAwakeEnemy = (p: BattleParticipant) => isFieldEnemy(p) && inMazePlay(p);

export function mazeAwareness(grid: MazeGrid, { participants, round, sleep }: AwarenessArgs): AwarenessResult {
  const watchers: Watcher[] = participants.filter(isMazeHero).flatMap((hero) => {
    const view = viewpointOf(hero);

    return view ? [{ hero, position: view.position, vision: mazeVision(grid, view) }] : [];
  });

  const spotter = (p: PlacedParticipant) => watchers.find((w) => seesParticipant(grid, w.vision, w.position, p.battleData.position))?.hero;

  const events: NewBattleEvent[] = [];

  const awakeBefore = participants.some(isAwakeEnemy);

  const next = participants.map((p) => {
    if (!isFieldEnemy(p)) return p;

    const seenBy = spotter(p);

    if (isDormant(p) && seenBy) {
      events.push(actorEvent(round, seenBy, MAZE_TEXTS.spotted(seenBy.basicInfo.name, p.basicInfo.name), { target: p, actionDetails: { mazeEvent: "spotted" } }));

      return { ...p, battleData: { ...p.battleData, dormant: false, mazeWakeRound: round + 1 } };
    }

    if (sleep && inMazePlay(p) && !seenBy) return { ...p, battleData: { ...p.battleData, dormant: true } };

    return p;
  });

  if (awakeBefore && !next.some(isAwakeEnemy)) events.push(systemEvent(round, MAZE_TEXTS.enemiesGone));

  return events.length === 0 && next.every((p, i) => p === participants[i]) ? { participants, events } : { participants: next, events };
}

interface AwareOutcome {
  participants: BattleParticipant[];
  events: NewBattleEvent[];
  scene?: ScenePatch;
}

/** Після кожної мутації в активному бою з готовим лабіринтом: прокидаються ті, кого побачили герої. */
export function withMazeAwareness<T extends AwareOutcome>(map: BattleMapConfig | null, scene: { status: BattleStatus; round: number }, result: T): T {
  const grid = mazeGridOf(map);

  if (!grid?.maze.exit || (result.scene?.status ?? scene.status) !== BattleStatus.ACTIVE) return result;

  const out = mazeAwareness(grid, { participants: result.participants, round: result.scene?.round ?? scene.round, sleep: false });

  if (out.participants === result.participants) return result;

  return { ...result, participants: out.participants, events: [...result.events, ...out.events] };
}
