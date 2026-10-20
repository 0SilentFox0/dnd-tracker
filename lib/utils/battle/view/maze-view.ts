import type { QueueEntry } from "./queue";

import { CombatStatus, DM_ACTOR, ParticipantSide, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { inMazePlay, isEscaped, seesParticipant, unionVision, type Viewpoint, viewpointOf } from "@/lib/utils/battle/maze";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type MazeRole = "dm" | "player" | "spectator";

export interface MazeView {
  role: MazeRole;
  /** null — бачить усі клітинки */
  cells: ReadonlySet<string> | null;
  visibleIds: ReadonlySet<string>;
  /** Свої герої гравця (або герой «Очима гравця»); для ДМ і глядача порожньо */
  ownIds: ReadonlySet<string>;
  /** Стіна на межі видимої клітинки (для гравця) */
  showWalls: (edge: string) => boolean;
  showTeleportLinks: boolean;
  showFog: boolean;
  showDormant: boolean;
  showExit: boolean;
  /** Для гравця: чорний екран зі своїм токеном */
  dark: boolean;
  mazeDark: boolean;
}

interface DeriveArgs {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  userId: string;
  isDM: boolean;
  asHeroId?: string | null;
}

const always = () => true;

const NO_IDS: ReadonlySet<string> = new Set();

const edgeCells = (edge: string): string[] => {
  const [x, y, side] = edge.split(":");

  const nx = Number(x) + (side === "e" ? 1 : 0);

  const ny = Number(y) + (side === "s" ? 1 : 0);

  return [`${x}:${y}`, `${nx}:${ny}`];
};

const idOf = (p: BattleParticipant) => p.basicInfo.id;

const onField = (p: BattleParticipant) => p.battleData.position !== undefined;

const isLiveHero = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY && isActive(p) && !isEscaped(p) && onField(p);

// непритомний герой живий: гравець лишається гравцем зі своїм полем зору, а не глядачем
const isOwnOnField = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY && p.combatStats.status !== CombatStatus.DEAD && !isEscaped(p) && onField(p);

export function deriveMazeView({ map, participants, userId, isDM, asHeroId }: DeriveArgs): MazeView | null {
  const maze = map.maze;

  if (!maze) return null;

  const grid = { cols: map.cols, rows: map.rows, maze };

  const base = { mazeDark: maze.dark };

  if (isDM && !asHeroId) {
    return { ...base, role: "dm", cells: null, visibleIds: new Set(participants.map(idOf)), ownIds: NO_IDS, showWalls: always, showTeleportLinks: true, showFog: true, showDormant: true, showExit: true, dark: false };
  }

  const own = participants.filter((p) => (isDM ? idOf(p) === asHeroId : p.basicInfo.controlledBy === userId) && isOwnOnField(p));

  if (own.length === 0) {
    const visible = participants.filter((p) => onField(p) && (isLiveHero(p) || (p.basicInfo.side !== ParticipantSide.ALLY && inMazePlay(p))));

    return { ...base, role: "spectator", cells: null, visibleIds: new Set(visible.map(idOf)), ownIds: NO_IDS, showWalls: always, showTeleportLinks: false, showFog: false, showDormant: false, showExit: true, dark: false };
  }

  const viewers = own.map(viewpointOf).filter((v): v is Viewpoint => v !== null);

  const cells = unionVision(grid, viewers);

  const visibleIds = new Set(own.map(idOf));

  for (const p of participants) {
    if (visibleIds.has(idOf(p)) || !onField(p) || isEscaped(p)) continue;

    const target = p.battleData.position!;

    if (viewers.some((v) => seesParticipant(grid, cells, v.position, target))) visibleIds.add(idOf(p));
  }

  return {
    ...base,
    role: "player",
    cells,
    visibleIds,
    ownIds: new Set(own.map(idOf)),
    showWalls: (edge) => edgeCells(edge).some((c) => cells.has(c)),
    showTeleportLinks: false,
    showFog: true,
    showDormant: true,
    showExit: true,
    dark: maze.dark,
  };
}

export const filterQueue = (queue: QueueEntry[], view: MazeView): QueueEntry[] =>
  queue.filter((e) => e.kind === "round" || view.visibleIds.has(idOf(e.participant)));

export const mazeCellVisible = (view: MazeView, x: number, y: number): boolean => view.cells === null || view.cells.has(cellKey({ x, y }));

export const MAZE_UNKNOWN_NAME = "невідомий";

const hidesFrom = (view: MazeView | null | undefined): view is MazeView => view?.role === "player";

const knows = (view: MazeView, id: string) => view.visibleIds.has(id) || view.ownIds.has(id);

const SERVICE_ACTORS: ReadonlySet<string> = new Set([DM_ACTOR.actorId, SYSTEM_ACTOR.actorId]);

/** Гравець у лабіринті бачить лише своїх і тих, хто зараз у полі зору; ДМ і глядач — усіх. */
export const mazeVisible = (view: MazeView | null | undefined, p: BattleParticipant): boolean => !hidesFrom(view) || knows(view, idOf(p));

export const visibleParticipants = (view: MazeView | null | undefined, list: BattleParticipant[]): BattleParticipant[] =>
  hidesFrom(view) ? list.filter((p) => knows(view, idOf(p))) : list;

const anyTargetKnown = (view: MazeView, e: BattleAction, known: (id: string) => boolean) => (e.targets ?? []).some((t) => known(t.participantId));

/** Журнал гравця: записи своїх і видимих; «помітив» — лише своїх героїв; зміни лабіринту ДМом приховані. Перетасовку не бачить ніхто. */
export function mazeLogVisible(view: MazeView | null | undefined, e: BattleAction): boolean {
  const kind = e.actionDetails?.mazeEvent;

  if (kind === "reshuffle") return false;

  if (!hidesFrom(view)) return true;

  if (kind === "op") return false;

  if (kind === "spotted") return view.ownIds.has(e.actorId);

  if (SERVICE_ACTORS.has(e.actorId)) return !e.targets?.length || anyTargetKnown(view, e, (id) => knows(view, id));

  // удар по своєму героєві гравець відчуває, навіть якщо нападника не видно
  return knows(view, e.actorId) || anyTargetKnown(view, e, (id) => view.ownIds.has(id));
}

/** FX: лише коли видно виконавця або хоч одну ціль. */
export function mazeFxVisible(view: MazeView | null | undefined, e: BattleAction): boolean {
  if (!hidesFrom(view)) return true;

  if (e.actionDetails?.mazeEvent) return false;

  return knows(view, e.actorId) || anyTargetKnown(view, e, (id) => knows(view, id));
}

export interface MazeMaskable {
  battle: { battleLog?: BattleAction[] };
  turn: { current: BattleParticipant | null; queue: QueueEntry[] };
  roster: { allies: BattleParticipant[]; enemies: BattleParticipant[] };
}

/** Сцена очима гравця в лабіринті: списки, черга, журнал і «ходить …» без прихованих. Сервер і далі шле повну сцену. */
export function maskMazeScene<T extends MazeMaskable>(scene: T, view: MazeView | null | undefined): T {
  if (!hidesFrom(view)) {
    const log = scene.battle.battleLog ?? [];

    return view && log.some((e) => !mazeLogVisible(view, e)) ? { ...scene, battle: { ...scene.battle, battleLog: log.filter((e) => mazeLogVisible(view, e)) } } : scene;
  }

  const { current } = scene.turn;

  const masked = current && !knows(view, idOf(current)) ? { ...current, basicInfo: { ...current.basicInfo, name: MAZE_UNKNOWN_NAME, avatar: undefined } } : current;

  return {
    ...scene,
    battle: { ...scene.battle, battleLog: (scene.battle.battleLog ?? []).filter((e) => mazeLogVisible(view, e)) },
    turn: { ...scene.turn, current: masked, queue: filterQueue(scene.turn.queue, view) },
    roster: { ...scene.roster, allies: visibleParticipants(view, scene.roster.allies), enemies: visibleParticipants(view, scene.roster.enemies) },
  } as T;
}
