import { pickAttack } from "./attack-reach";
import { cellKey } from "./geometry";
import { type CellMark, isMoveMark, moveZoneMarks, targetMarks } from "./map-view";
import { cellsOf, isOnMap, sizeOf } from "./occupancy";
import { templateAimAllowed, templateArea } from "./template";

import { AttackType } from "@/lib/constants/battle";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { canSeeExactStats, type Viewer } from "@/lib/utils/battle/view/visibility";
import type { BattleMapConfig, BattleMapView, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";

export interface MapAim {
  template: SpellTemplate;
  casterId: string;
  range?: number;
  aim?: GridPoint;
  onAim(cell: GridPoint): void;
}

/** Хто дивиться на карту й чи може зараз ходити. */
export interface MapSceneActor {
  current: BattleParticipant | null;
  viewer: Viewer;
  canAct: boolean;
  isDM: boolean;
  /** Фаза ходу дозволяє атаку; інакше клік по ворогу — вибір, а цілі не підсвічуються */
  attackReady: boolean;
}

/** Режим кліку по карті: розстановка DM, інструмент місцевості або наведення шаблону. */
export interface MapSceneMode {
  placing: boolean;
  placingId: string | null;
  toolActive?: boolean;
  aim?: MapAim | null;
}

export interface MapSceneInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  selectedId: string | null;
  actor: MapSceneActor;
  mode: MapSceneMode;
}

export type MapClick =
  | { kind: "none" }
  | { kind: "move"; participantId: string; to: GridPoint; free: boolean }
  | { kind: "attack"; targetId: string; attackId?: string }
  | { kind: "reject"; reason: string }
  | { kind: "select"; id: string }
  | { kind: "arm"; id: string }
  | { kind: "aim"; cell: GridPoint };

export interface MapScene {
  participants: BattleParticipant[];
  view: BattleMapView;
  aiming: boolean;
  cellClick(p: GridPoint): MapClick;
  tokenClick(id: string): MapClick;
}

export function centreCell(p: BattleParticipant): GridPoint {
  const [anchor] = cellsOf(p);

  const offset = Math.floor((sizeOf(p) - 1) / 2);

  return { x: anchor.x + offset, y: anchor.y + offset };
}

export function canStartAttack(p: BattleParticipant | null): p is BattleParticipant {
  return !!p && (p.battleData.attacks ?? []).length > 0 && (!p.actionFlags.hasUsedAction || (p.battleData.pendingExtraActions ?? 0) > 0);
}

function enemyAt(participants: BattleParticipant[], of: BattleParticipant | null, key: string): BattleParticipant | undefined {
  return participants.find((x) => x.basicInfo.side !== of?.basicInfo.side && isOnMap(x) && cellsOf(x).some((c) => cellKey(c) === key));
}

export interface TrajectoryInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  marks: BattleMapView["marks"];
  current: BattleParticipant | null;
}

export function deriveTrajectory({ map, participants, marks, current }: TrajectoryInput, hover: GridPoint | null): BattleMapView["trajectory"] {
  if (!current || !hover || marks?.get(cellKey(hover)) !== "target") return null;

  const target = enemyAt(participants, current, cellKey(hover));

  const attack = target && pickAttack(map, participants, current, current.battleData.attacks ?? [], target).attack;

  if (!target || !attack) return null;

  return { fromId: current.basicInfo.id, targetId: target.basicInfo.id, to: hover, kind: attackKindOf(attack.type) === AttackType.MELEE ? "melee" : "ranged" };
}

export interface AimScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
}

/** Клітинки шаблону в точці `at`; null — заклинатель поза картою або точка поза дальністю. */
export function aimView({ map, participants }: AimScene, aim: MapAim, at: GridPoint): { marks: Map<string, CellMark>; aim: GridPoint } | null {
  const caster = participants.find((p) => p.basicInfo.id === aim.casterId);

  if (!caster || !isOnMap(caster) || !templateAimAllowed(cellsOf(caster), aim.template, at, aim.range)) return null;

  const { cells } = templateArea(map, participants, caster, aim.template, at);

  return { marks: new Map(cells.map((key) => [key, "template" as const])), aim: at };
}

export function deriveMapScene({ map, selectedId, actor, mode, ...input }: MapSceneInput): MapScene {
  const { current, viewer, canAct, isDM, attackReady } = actor;

  const { placingId } = mode;

  const placing = mode.placing && isDM;

  const tool = Boolean(mode.toolActive) && isDM;

  const participants = input.participants.filter((p) => !p.battleData.reserved);

  const aimCaster = mode.aim && !placing && !tool ? participants.find((p) => p.basicInfo.id === mode.aim?.casterId) : undefined;

  const aim = aimCaster && isOnMap(aimCaster) ? mode.aim : null;

  const marks = new Map<string, CellMark | number>();

  const attacks = current?.battleData.attacks ?? [];

  const canAttack = attackReady && canStartAttack(current);

  const aimed = aim?.aim ? aimView({ map, participants }, aim, aim.aim) : null;

  if (aimed) for (const [key, mark] of aimed.marks) marks.set(key, mark);

  if (!aim && !placing && !tool && canAct && current?.battleData.position) {
    for (const [key, cost] of moveZoneMarks(map, participants, current, { dmUserId: isDM ? viewer.userId : null })) marks.set(key, cost);

    if (canAttack) for (const [key, mark] of targetMarks(map, participants, current, attacks)) marks.set(key, mark);
  }

  const hud: NonNullable<BattleMapView["hud"]> = new Map();

  for (const p of participants) hud.set(p.basicInfo.id, { exact: canSeeExactStats(p, viewer) });

  const view: BattleMapView = {
    selectedId: placing ? placingId : selectedId,
    currentId: current?.basicInfo.id ?? null,
    marks,
    trajectory: null,
    hud,
    ...(aimed && { aim: aimed.aim }),
  };

  function aimAt(p: GridPoint): MapClick {
    return aim && aimCaster && templateAimAllowed(cellsOf(aimCaster), aim.template, p, aim.range) ? { kind: "aim", cell: p } : { kind: "reject", reason: "Поза дальністю" };
  }

  function tokenClick(id: string): MapClick {
    if (tool) return { kind: "none" };

    const target = participants.find((p) => p.basicInfo.id === id);

    if (placing) return target && isOnMap(target) ? { kind: "arm", id } : { kind: "none" };

    if (aim) return target && isOnMap(target) ? aimAt(centreCell(target)) : { kind: "none" };

    if (canAct && canAttack && current && target && target.basicInfo.side !== current.basicInfo.side && isOnMap(target)) {
      const mark = marks.get(cellKey(cellsOf(target)[0]));

      if (mark === "target") {
        const { attack } = pickAttack(map, participants, current, attacks, target);

        return { kind: "attack", targetId: id, ...(attack && { attackId: attack.id ?? attack.name }) };
      }

      if (mark === "invalid-target") return { kind: "reject", reason: pickAttack(map, participants, current, attacks, target).error ?? "Ціль недосяжна" };
    }

    return { kind: "select", id };
  }

  function cellClick(p: GridPoint): MapClick {
    if (tool) return { kind: "none" };

    if (placing) {
      const placed = placingId ? participants.find((x) => x.basicInfo.id === placingId) : undefined;

      return placed && isOnMap(placed) ? { kind: "move", participantId: placed.basicInfo.id, to: p, free: true } : { kind: "none" };
    }

    if (aim) return aimAt(p);

    const key = cellKey(p);

    const mark = marks.get(key);

    if (current && isOnMap(current) && cellKey(cellsOf(current)[0]) === key) return { kind: "select", id: current.basicInfo.id };

    if (canAct && current && isMoveMark(mark)) return { kind: "move", participantId: current.basicInfo.id, to: p, free: false };

    if (mark === "target" || mark === "invalid-target") {
      const occupant = enemyAt(participants, current, key);

      if (occupant) return tokenClick(occupant.basicInfo.id);
    }

    return { kind: "none" };
  }

  return { participants, view, aiming: !!aim, cellClick, tokenClick };
}
