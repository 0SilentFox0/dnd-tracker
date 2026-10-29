import { pickAttack } from "./attack-reach";
import { cellKey } from "./geometry";
import { lineOfFire } from "./line-of-fire";
import { type CellMark, isMoveMark, moveSteps, moveZoneMarks, targetMarks } from "./map-view";
import { cellsOf, isOnMap, sizeOf } from "./occupancy";
import { aimInRange, apexOf, isCenteredTemplate, templateAimAllowed, templateArea } from "./template";

import { AttackType } from "@/lib/constants/battle";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { canAttackFromPool } from "@/lib/utils/battle/attack/attacks-left";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { hasCondition } from "@/lib/utils/battle/conditions/query";
import { modeAimHiddenText, modeMoveZone } from "@/lib/utils/battle/modes/engine";
import type { ModeMoveZone, ModeView } from "@/lib/utils/battle/modes/types";
import { canSeeExactStats, type Viewer } from "@/lib/utils/battle/view/visibility";
import type { BattleMapConfig, BattleMapView, BattleParticipant, GridPoint, SpellTemplate } from "@/types/battle";

export interface MapAim {
  template: SpellTemplate;
  casterId: string;
  range?: number;
  aim?: GridPoint;
  onAim(cell: GridPoint): void;
  /** точка прев'ю під курсором (null — поза дальністю чи поза картою) для живого списку зачеплених */
  onHover?(cell: GridPoint | null): void;
}

/** Вибір цілей заклинання кліком по токенах: кого можна обрати, хто вже обраний. */
export interface MapPick {
  casterId: string;
  targets: { id: string; reachable: boolean; filteredOut?: boolean }[];
  selectedIds: string[];
  onPick(id: string): void;
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
  pick?: MapPick | null;
}

export interface MapSceneInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  selectedId: string | null;
  actor: MapSceneActor;
  mode: MapSceneMode;
  modeView?: ModeView | null;
}

export type MapClick =
  | { kind: "none" }
  | { kind: "move"; participantId: string; to: GridPoint; free: boolean }
  | { kind: "attack"; targetId: string; attackId?: string }
  | { kind: "reject"; reason: string }
  | { kind: "select"; id: string }
  | { kind: "arm"; id: string }
  | { kind: "aim"; cell: GridPoint }
  | { kind: "pick"; id: string };

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
  return !!p && (p.battleData.attacks ?? []).length > 0 && (!p.actionFlags.hasUsedAction || (p.battleData.pendingExtraActions ?? 0) > 0 || canAttackFromPool(p));
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

  const kind = attackKindOf(attack.type) === AttackType.MELEE ? "melee" : "ranged";

  const line = kind === "ranged" ? lineOfFire(map, participants, current, target) : null;

  return { fromId: current.basicInfo.id, targetId: target.basicInfo.id, to: hover, kind, ...(line?.blocked && { cover: line.cells }) };
}

export interface AimScene {
  map: BattleMapConfig;
  participants: BattleParticipant[];
}

/** Клітинки шаблону в точці `at`; null — заклинатель поза картою, точка поза дальністю або шаблон без клітинок. Пульс іде від центру кола/куба або від вершини конуса/лінії. */
export function aimView({ map, participants }: AimScene, aim: MapAim, at: GridPoint): { marks: Map<string, CellMark>; aim: GridPoint | null; pulseFrom: GridPoint } | null {
  const caster = findParticipant(participants, aim.casterId);

  if (!caster || !isOnMap(caster) || !templateAimAllowed(cellsOf(caster), aim.template, at, aim.range) || modeAimHiddenText(map, caster, at)) return null;

  const { cells } = templateArea(map, participants, caster, aim.template, at);

  if (cells.length === 0) return null;

  const { shape, hollow } = aim.template;

  const pulseFrom = shape === "cone" || shape === "line" ? apexOf(cellsOf(caster), at) : at;

  return { marks: new Map(cells.map((key) => [key, "template" as const])), aim: hollow ? null : at, pulseFrom };
}

function outOfRangeMarks(map: BattleMapConfig, origin: GridPoint[], rangeFeet: number): Map<string, CellMark> {
  const out = new Map<string, CellMark>();

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) if (!aimInRange(origin, { x, y }, rangeFeet)) out.set(cellKey({ x, y }), "out-of-range");
  }

  return out;
}

interface MoveZoneInput {
  map: BattleMapConfig;
  participants: BattleParticipant[];
  seen: BattleParticipant[];
  mover: BattleParticipant;
  view: ModeView | null | undefined;
  dmUserId: string | null;
}

type MoveZone = ModeMoveZone;

function openMoveZone({ map, participants, mover, dmUserId }: MoveZoneInput): MoveZone {
  const steps = moveSteps(map, participants, mover, { dmUserId });

  return { steps, marks: moveZoneMarks(map, participants, mover, { dmUserId, steps }) };
}

const moveZone = (input: MoveZoneInput): MoveZone => modeMoveZone(input.map, input) ?? openMoveZone(input);

export function deriveMapScene({ map, selectedId, actor, mode, modeView, ...input }: MapSceneInput): MapScene {
  const { current, viewer, canAct, isDM, attackReady } = actor;

  const { placingId } = mode;

  const placing = mode.placing && isDM;

  const tool = Boolean(mode.toolActive) && isDM;

  const participants = input.participants.filter((p) => !p.battleData.reserved);

  const aimCaster = mode.aim && !placing && !tool ? findParticipant(participants, mode.aim.casterId) : undefined;

  const aim = aimCaster && isOnMap(aimCaster) ? mode.aim : null;

  const pick = mode.pick && !placing && !tool && !aim ? mode.pick : null;

  const marks = new Map<string, CellMark | number>();

  const attacks = current?.battleData.attacks ?? [];

  const canAttack = attackReady && canStartAttack(current);

  if (aim && aimCaster && aim.range !== undefined && isCenteredTemplate(aim.template)) {
    for (const [key, mark] of outOfRangeMarks(map, cellsOf(aimCaster), aim.range)) marks.set(key, mark);
  }

  const aimed = aim?.aim ? aimView({ map, participants }, aim, aim.aim) : null;

  if (aimed) for (const [key, mark] of aimed.marks) marks.set(key, mark);

  const seen = (modeView ? participants.filter((p) => modeView.visibleIds.has(p.basicInfo.id)) : participants).filter(
    (p) => !hasCondition(p, "invisible") || isDM || p.basicInfo.controlledBy === viewer.userId,
  );

  const canMove = !aim && !pick && !placing && !tool && canAct && current?.battleData.position;

  const zone = canMove && current ? moveZone({ map, participants, seen, mover: current, view: modeView, dmUserId: isDM ? viewer.userId : null }) : null;

  const steps = zone?.steps ?? null;

  if (zone && current) {
    for (const [key, mark] of zone.marks) marks.set(key, mark);

    if (canAttack) for (const [key, mark] of targetMarks(map, seen, current, attacks)) marks.set(key, mark);
  }

  if (pick) {
    for (const { id, reachable } of pick.targets) {
      const target = findParticipant(participants, id);

      if (!target || !isOnMap(target)) continue;

      const mark: CellMark = !reachable ? "invalid-target" : pick.selectedIds.includes(id) ? "picked" : "pick";

      for (const c of cellsOf(target)) marks.set(cellKey(c), mark);
    }
  }

  const hud: NonNullable<BattleMapView["hud"]> = new Map();

  for (const p of participants) hud.set(p.basicInfo.id, { exact: canSeeExactStats(p, viewer) });

  const view: BattleMapView = {
    selectedId: placing ? placingId : selectedId,
    currentId: current?.basicInfo.id ?? null,
    marks,
    trajectory: null,
    hud,
    ...(aimed && { aim: aimed.aim, pulseFrom: aimed.pulseFrom }),
  };

  function aimAt(p: GridPoint): MapClick {
    if (!aim || !aimCaster || !templateAimAllowed(cellsOf(aimCaster), aim.template, p, aim.range)) return { kind: "reject", reason: "Поза дальністю" };

    const hidden = modeAimHiddenText(map, aimCaster, p);

    if (hidden) return { kind: "reject", reason: hidden };

    return aimView({ map, participants }, aim, p) ? { kind: "aim", cell: p } : { kind: "reject", reason: "Оберіть напрямок" };
  }

  function pickAt(id: string): MapClick {
    const entry = pick?.targets.find((t) => t.id === id);

    if (!entry || entry.filteredOut) return { kind: "reject", reason: "Ця ціль не підходить для заклинання" };

    return entry.reachable ? { kind: "pick", id } : { kind: "reject", reason: "Поза дальністю" };
  }

  function tokenClick(id: string): MapClick {
    if (tool) return { kind: "none" };

    const target = findParticipant(participants, id);

    if (placing) return target && isOnMap(target) ? { kind: "arm", id } : { kind: "none" };

    if (aim) return target && isOnMap(target) ? aimAt(centreCell(target)) : { kind: "none" };

    if (pick) return pickAt(id);

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
      const placed = placingId ? findParticipant(participants, placingId) : undefined;

      return placed && isOnMap(placed) ? { kind: "move", participantId: placed.basicInfo.id, to: p, free: true } : { kind: "none" };
    }

    if (aim) return aimAt(p);

    const key = cellKey(p);

    if (pick) {
      const occupant = participants.find((x) => isOnMap(x) && cellsOf(x).some((c) => cellKey(c) === key));

      return occupant ? tokenClick(occupant.basicInfo.id) : { kind: "none" };
    }

    const mark = marks.get(key);

    if (current && isOnMap(current) && cellsOf(current).some((c) => cellKey(c) === key)) return { kind: "select", id: current.basicInfo.id };

    if (canAct && current && isMoveMark(mark)) return { kind: "move", participantId: current.basicInfo.id, to: steps?.get(key)?.anchor ?? p, free: false };

    if (mark === "target" || mark === "invalid-target") {
      const occupant = enemyAt(participants, current, key);

      if (occupant) return tokenClick(occupant.basicInfo.id);
    }

    return { kind: "none" };
  }

  return { participants: participants.filter((p) => !hasCondition(p, "invisible") || isDM || p.basicInfo.controlledBy === viewer.userId), view, aiming: !!aim, cellClick, tokenClick };
}
