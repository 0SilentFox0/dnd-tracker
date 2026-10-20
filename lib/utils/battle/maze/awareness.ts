import { inMazePlay, isDormant, isMazeHero } from "./status";
import type { MazeGrid } from "./vision";
import { mazeVision, seesParticipant, viewpointOf } from "./vision";

import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { systemEvent } from "@/lib/utils/battle/store/event-mapping";
import type { NewBattleEvent, ScenePatch } from "@/lib/utils/battle/store/types";
import type { BattleAction, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

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

export const MAZE_ENEMIES_GONE = "Вороги зникли в лабіринті";

const isEnemy = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ENEMY && p.battleData.position !== undefined && !p.battleData.reserved;

const isAwakeEnemy = (p: BattleParticipant) => isEnemy(p) && inMazePlay(p);

export function heroEvent(round: number, hero: BattleParticipant, resultText: string, { target, actionDetails = {} }: { target?: BattleParticipant; actionDetails?: BattleAction["actionDetails"] } = {}): NewBattleEvent {
  return {
    type: "ability",
    round,
    actorId: hero.basicInfo.id,
    targets: target ? [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name }] : [],
    resultText,
    details: { actorName: hero.basicInfo.name, actorSide: hero.basicInfo.side, actionDetails },
  };
}

export function mazeAwareness(grid: MazeGrid, { participants, round, sleep }: AwarenessArgs): AwarenessResult {
  const watchers: Watcher[] = participants.filter(isMazeHero).flatMap((hero) => {
    const view = viewpointOf(hero);

    return view ? [{ hero, position: view.position, vision: mazeVision(grid, view) }] : [];
  });

  const spotter = (p: BattleParticipant) => watchers.find((w) => seesParticipant(grid, w.vision, w.position, p.battleData.position as GridPoint))?.hero;

  const events: NewBattleEvent[] = [];

  const awakeBefore = participants.some(isAwakeEnemy);

  const next = participants.map((p) => {
    if (!isEnemy(p) || !isActive(p)) return p;

    const seenBy = spotter(p);

    if (isDormant(p) && seenBy) {
      events.push(heroEvent(round, seenBy, `${seenBy.basicInfo.name} помітив ${p.basicInfo.name}`, { target: p, actionDetails: { mazeEvent: "spotted" } }));

      return { ...p, battleData: { ...p.battleData, dormant: false, mazeWakeRound: round + 1 } };
    }

    if (sleep && inMazePlay(p) && !seenBy) return { ...p, battleData: { ...p.battleData, dormant: true } };

    return p;
  });

  if (awakeBefore && !next.some(isAwakeEnemy)) events.push(systemEvent(round, MAZE_ENEMIES_GONE));

  return events.length === 0 && next.every((p, i) => p === participants[i]) ? { participants, events } : { participants: next, events };
}

interface AwareOutcome {
  participants: BattleParticipant[];
  events: NewBattleEvent[];
  scene?: ScenePatch;
}

/** Після кожної мутації в активному бою з готовим лабіринтом: прокидаються ті, кого побачили герої. */
export function withMazeAwareness<T extends AwareOutcome>(map: BattleMapConfig | null, scene: { status: BattleStatus; round: number }, result: T): T {
  const maze = map?.maze;

  if (!map || !maze?.exit || (result.scene?.status ?? scene.status) !== BattleStatus.ACTIVE) return result;

  const out = mazeAwareness({ cols: map.cols, rows: map.rows, maze }, { participants: result.participants, round: result.scene?.round ?? scene.round, sleep: false });

  if (out.participants === result.participants) return result;

  return { ...result, participants: out.participants, events: [...result.events, ...out.events] };
}
