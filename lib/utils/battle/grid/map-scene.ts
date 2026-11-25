import { pickAttack } from './attack-reach';
import { cellKey } from './geometry';
import type { GridWindow } from './layout';
import { lineOfFire } from './line-of-fire';
import {
    type CellMark,
    isMoveMark,
    moveReach,
    moveZoneMarks,
    targetMarks,
} from './map-view';
import { cellsOf, isOnMap, sizeOf } from './occupancy';
import { wallsAllowAim } from './sight';
import {
    apexOf,
    feetToCells,
    isCenteredTemplate,
    templateAimAllowed,
    templateArea,
} from './template';

import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { canAttackFromPool } from '@/lib/utils/battle/attack/attacks-left';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { hasCondition } from '@/lib/utils/battle/conditions/query';
import {
    isHostile,
    modeAimHiddenText,
    modeMoveZone,
} from '@/lib/utils/battle/modes/engine';
import type { ModeMoveZone, ModeView } from '@/lib/utils/battle/modes/types';
import { REJECT } from '@/lib/utils/battle/store/reject';
import {
    canSeeExactStats,
    type Viewer,
} from '@/lib/utils/battle/view/visibility';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapConfig,
    BattleMapView,
    GridPoint,
    SpellTemplate,
} from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface MapAim {
    template: SpellTemplate;
    casterId: string;
    range?: number;
    aim?: GridPoint;
    onAim(cell: GridPoint): void;
    onHover?(cell: GridPoint | null): void;
}

export interface MapPick {
    casterId: string;
    targets: { id: string; reachable: boolean; filteredOut?: boolean }[];
    selectedIds: string[];
    onPick(id: string): void;
}

export interface MapSceneActor {
    current: BattleParticipant | null;
    viewer: Viewer;
    canAct: boolean;
    isDM: boolean;
    attackReady: boolean;
}

export interface MapSceneMode {
    placing: boolean;
    placingId: string | null;
    toolActive?: boolean;
    aim?: MapAim | null;
    pick?: MapPick | null;
}

export interface MapSceneInput {
    map: BattleMapConfig;
    rules: Ruleset;
    participants: BattleParticipant[];
    selectedId: string | null;
    actor: MapSceneActor;
    mode: MapSceneMode;
    modeView?: ModeView | null;
}

export type MapClick =
    | { kind: 'none' }
    | { kind: 'move'; participantId: string; to: GridPoint; free: boolean }
    | { kind: 'attack'; targetId: string; attackId?: string }
    | { kind: 'reject'; reason: LogLine }
    | { kind: 'select'; id: string }
    | { kind: 'arm'; id: string }
    | { kind: 'aim'; cell: GridPoint }
    | { kind: 'pick'; id: string };

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

export function canStartAttack(
    p: BattleParticipant | null
): p is BattleParticipant {
    return (
        !!p &&
        (p.battleData.attacks ?? []).length > 0 &&
        (!p.actionFlags.hasUsedAction ||
            (p.battleData.pendingExtraActions ?? 0) > 0 ||
            canAttackFromPool(p))
    );
}

function enemyAt(
    map: BattleMapConfig,
    participants: BattleParticipant[],
    of: BattleParticipant | null,
    key: string
): BattleParticipant | undefined {
    return participants.find(
        (x) =>
            !!of &&
            isHostile(map, of, x) &&
            isOnMap(x) &&
            cellsOf(x).some((c) => cellKey(c) === key)
    );
}

export interface TrajectoryInput {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    marks: BattleMapView['marks'];
    current: BattleParticipant | null;
    rules: Ruleset;
}

export function deriveTrajectory(
    { map, participants, marks, current, rules }: TrajectoryInput,
    hover: GridPoint | null
): BattleMapView['trajectory'] {
    if (!current || !hover || marks?.get(cellKey(hover)) !== 'target')
        return null;

    const target = enemyAt(map, participants, current, cellKey(hover));

    const attack =
        target &&
        pickAttack(
            map,
            participants,
            current,
            current.battleData.attacks ?? [],
            target,
            rules
        ).attack;

    if (!target || !attack) return null;

    const kind =
        attackKindOf(attack.type) === AttackType.MELEE ? 'melee' : 'ranged';

    const line =
        kind === 'ranged'
            ? lineOfFire(map, participants, current, target)
            : null;

    return {
        fromId: current.basicInfo.id,
        targetId: target.basicInfo.id,
        to: hover,
        kind,
        ...(line?.blocked && { cover: line.cells }),
    };
}

export interface AimScene {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    rules: Ruleset;
}

export function aimView(
    { map, participants, rules }: AimScene,
    aim: MapAim,
    at: GridPoint
): {
    marks: Map<string, CellMark>;
    aim: GridPoint | null;
    pulseFrom: GridPoint;
} | null {
    const caster = findParticipant(participants, aim.casterId);

    if (
        !caster ||
        !isOnMap(caster) ||
        !templateAimAllowed(
            cellsOf(caster),
            aim.template,
            at,
            aim.range,
            rules
        ) ||
        modeAimHiddenText(map, caster, at) ||
        !wallsAllowAim(map, caster, at)
    )
        return null;

    const { cells } = templateArea(
        map,
        participants,
        caster,
        aim.template,
        at,
        rules
    );

    if (cells.length === 0) return null;

    const { shape, hollow } = aim.template;

    const pulseFrom =
        shape === 'cone' || shape === 'line' ? apexOf(cellsOf(caster), at) : at;

    return {
        marks: new Map(cells.map((key) => [key, 'template' as const])),
        aim: hollow ? null : at,
        pulseFrom,
    };
}

function rangeWindow(
    map: BattleMapConfig,
    origin: GridPoint[],
    rangeFeet: number,
    rules: Ruleset
): GridWindow {
    if (!origin.length) return { x: 0, y: 0, cols: 0, rows: 0 };

    const r = feetToCells(rangeFeet, rules);

    const xs = origin.map((c) => c.x);

    const ys = origin.map((c) => c.y);

    const x0 = Math.max(0, Math.min(...xs) - r);

    const y0 = Math.max(0, Math.min(...ys) - r);

    const x1 = Math.min(map.cols - 1, Math.max(...xs) + r);

    const y1 = Math.min(map.rows - 1, Math.max(...ys) + r);

    return {
        x: x0,
        y: y0,
        cols: Math.max(0, x1 - x0 + 1),
        rows: Math.max(0, y1 - y0 + 1),
    };
}

interface MoveZoneInput {
    map: BattleMapConfig;
    participants: BattleParticipant[];
    seen: BattleParticipant[];
    mover: BattleParticipant;
    view: ModeView | null | undefined;
    dmUserId: string | null;
    rules: Ruleset;
}

type MoveZone = ModeMoveZone;

function openMoveZone({
    map,
    participants,
    mover,
    dmUserId,
    rules,
}: MoveZoneInput): MoveZone {
    const { steps, search } = moveReach(map, participants, mover, {
        dmUserId,
        rules,
    });

    return {
        steps,
        search,
        marks: moveZoneMarks(map, participants, mover, {
            dmUserId,
            rules,
            steps,
        }),
    };
}

const moveZone = (input: MoveZoneInput): MoveZone =>
    modeMoveZone(input.map, input) ?? openMoveZone(input);

interface SceneState {
    map: BattleMapConfig;
    rules: Ruleset;
    participants: BattleParticipant[];
    actor: MapSceneActor;
    placing: boolean;
    placingId: string | null;
    tool: boolean;
    aim: MapAim | null;
    aimCaster: BattleParticipant | undefined;
    pick: MapPick | null;
    canAttack: boolean;
    attacks: BattleParticipant['battleData']['attacks'];
    marks: Map<string, CellMark | number>;
    steps: MoveZone['steps'] | null;
    search: MoveZone['search'] | null;
}

const canSee = (p: BattleParticipant, { isDM, viewer }: MapSceneActor) =>
    !hasCondition(p, 'invisible') ||
    isDM ||
    p.basicInfo.controlledBy === viewer.userId;

function resolveMode(
    input: MapSceneInput,
    participants: BattleParticipant[]
): Pick<
    SceneState,
    'placing' | 'placingId' | 'tool' | 'aim' | 'aimCaster' | 'pick'
> {
    const { mode, actor } = input;

    const placing = mode.placing && actor.isDM;

    const tool = Boolean(mode.toolActive) && actor.isDM;

    const aimCaster =
        mode.aim && !placing && !tool
            ? findParticipant(participants, mode.aim.casterId)
            : undefined;

    const aim = aimCaster && isOnMap(aimCaster) ? mode.aim : null;

    return {
        placing,
        placingId: mode.placingId,
        tool,
        aim: aim ?? null,
        aimCaster,
        pick: mode.pick && !placing && !tool && !aim ? mode.pick : null,
    };
}

function pickMarks(
    participants: BattleParticipant[],
    pick: MapPick
): Map<string, CellMark> {
    const marks = new Map<string, CellMark>();

    for (const { id, reachable } of pick.targets) {
        const target = findParticipant(participants, id);

        if (!target || !isOnMap(target)) continue;

        const mark: CellMark = !reachable
            ? 'invalid-target'
            : pick.selectedIds.includes(id)
              ? 'picked'
              : 'pick';

        for (const c of cellsOf(target)) marks.set(cellKey(c), mark);
    }

    return marks;
}

function visibleToViewer({
    participants,
    actor,
    modeView,
}: Pick<MapSceneInput, 'actor' | 'modeView'> & {
    participants: BattleParticipant[];
}): BattleParticipant[] {
    return (
        modeView
            ? participants.filter((p) =>
                  modeView.visibleIds.has(p.basicInfo.id)
              )
            : participants
    ).filter((p) => canSee(p, actor));
}

function buildMarks(
    state: Pick<
        SceneState,
        | 'map'
        | 'rules'
        | 'participants'
        | 'actor'
        | 'placing'
        | 'tool'
        | 'aim'
        | 'pick'
        | 'canAttack'
        | 'attacks'
    >,
    aimed: ReturnType<typeof aimView>,
    modeView: ModeView | null | undefined
): {
    marks: Map<string, CellMark | number>;
    steps: SceneState['steps'];
    search: SceneState['search'];
} {
    const { map, rules, participants, actor, aim, pick } = state;

    const { current, viewer, canAct, isDM } = actor;

    const seen = visibleToViewer({ participants, actor, modeView });

    const marks = new Map<string, CellMark | number>();

    if (aimed) for (const [key, mark] of aimed.marks) marks.set(key, mark);

    const canMove =
        !aim &&
        !pick &&
        !state.placing &&
        !state.tool &&
        canAct &&
        current?.battleData.position;

    const zone =
        canMove && current
            ? moveZone({
                  map,
                  participants,
                  seen,
                  mover: current,
                  view: modeView,
                  dmUserId: isDM ? viewer.userId : null,
                  rules,
              })
            : null;

    if (zone && current) {
        for (const [key, mark] of zone.marks) marks.set(key, mark);

        if (state.canAttack)
            for (const [key, mark] of targetMarks(
                map,
                seen,
                current,
                state.attacks ?? [],
                rules
            ))
                marks.set(key, mark);
    }

    if (pick)
        for (const [key, mark] of pickMarks(participants, pick))
            marks.set(key, mark);

    return {
        marks,
        steps: zone?.steps ?? null,
        search: zone?.search ?? null,
    };
}

function aimClick(s: SceneState, p: GridPoint): MapClick {
    const { aim, aimCaster, map, participants, rules } = s;

    if (
        !aim ||
        !aimCaster ||
        !templateAimAllowed(
            cellsOf(aimCaster),
            aim.template,
            p,
            aim.range,
            rules
        )
    )
        return { kind: 'reject', reason: textRef(REJECT.outOfRange) };

    const hidden = modeAimHiddenText(map, aimCaster, p);

    if (hidden) return { kind: 'reject', reason: hidden };

    if (!wallsAllowAim(map, aimCaster, p))
        return { kind: 'reject', reason: textRef(REJECT.targetUnreachable) };

    return aimView({ map, participants, rules }, aim, p)
        ? { kind: 'aim', cell: p }
        : { kind: 'reject', reason: textRef(REJECT.pickDirection) };
}

function pickClick(pick: MapPick | null, id: string): MapClick {
    const entry = pick?.targets.find((t) => t.id === id);

    if (!entry || entry.filteredOut)
        return { kind: 'reject', reason: textRef(REJECT.badSpellTarget) };

    return entry.reachable
        ? { kind: 'pick', id }
        : { kind: 'reject', reason: textRef(REJECT.outOfRange) };
}

function attackClick(
    s: SceneState,
    target: BattleParticipant
): MapClick | null {
    const { map, participants, rules, marks, attacks, actor } = s;

    const { current } = actor;

    if (
        !actor.canAct ||
        !s.canAttack ||
        !current ||
        !isHostile(map, current, target) ||
        !isOnMap(target)
    )
        return null;

    const mark = marks.get(cellKey(cellsOf(target)[0]));

    if (mark !== 'target' && mark !== 'invalid-target') return null;

    const { attack, error } = pickAttack(
        map,
        participants,
        current,
        attacks ?? [],
        target,
        rules
    );

    return mark === 'target'
        ? {
              kind: 'attack',
              targetId: target.basicInfo.id,
              ...(attack && { attackId: attack.id ?? attack.name }),
          }
        : {
              kind: 'reject',
              reason: error ?? textRef(REJECT.targetUnreachable),
          };
}

function tokenClickOf(s: SceneState, id: string): MapClick {
    if (s.tool) return { kind: 'none' };

    const target = findParticipant(s.participants, id);

    if (s.placing)
        return target && isOnMap(target)
            ? { kind: 'arm', id }
            : { kind: 'none' };

    if (s.aim)
        return target && isOnMap(target)
            ? aimClick(s, centreCell(target))
            : { kind: 'none' };

    if (s.pick) return pickClick(s.pick, id);

    return (target && attackClick(s, target)) ?? { kind: 'select', id };
}

function placeClick(s: SceneState, p: GridPoint): MapClick {
    const placed = s.placingId
        ? findParticipant(s.participants, s.placingId)
        : undefined;

    return placed && isOnMap(placed)
        ? {
              kind: 'move',
              participantId: placed.basicInfo.id,
              to: p,
              free: true,
          }
        : { kind: 'none' };
}

function cellClickOf(s: SceneState, p: GridPoint): MapClick {
    if (s.tool) return { kind: 'none' };

    if (s.placing) return placeClick(s, p);

    if (s.aim) return aimClick(s, p);

    const key = cellKey(p);

    const { current, canAct } = s.actor;

    if (s.pick) {
        const occupant = s.participants.find(
            (x) => isOnMap(x) && cellsOf(x).some((c) => cellKey(c) === key)
        );

        return occupant
            ? tokenClickOf(s, occupant.basicInfo.id)
            : { kind: 'none' };
    }

    const mark = s.marks.get(key);

    if (
        current &&
        isOnMap(current) &&
        cellsOf(current).some((c) => cellKey(c) === key)
    )
        return { kind: 'select', id: current.basicInfo.id };

    if (canAct && current && isMoveMark(mark))
        return {
            kind: 'move',
            participantId: current.basicInfo.id,
            to: s.steps?.get(key)?.anchor ?? p,
            free: false,
        };

    if (mark === 'target' || mark === 'invalid-target') {
        const occupant = enemyAt(s.map, s.participants, current, key);

        if (occupant) return tokenClickOf(s, occupant.basicInfo.id);
    }

    return { kind: 'none' };
}

export function deriveMapScene(input: MapSceneInput): MapScene {
    const { map, rules, selectedId, actor, modeView } = input;

    const { current, viewer } = actor;

    const participants = input.participants.filter(
        (p) => !p.battleData.reserved
    );

    const modeState = resolveMode(input, participants);

    const { aim, aimCaster, placing } = modeState;

    const range: GridWindow | null =
        aim &&
        aimCaster &&
        aim.range !== undefined &&
        isCenteredTemplate(aim.template)
            ? rangeWindow(map, cellsOf(aimCaster), aim.range, rules)
            : null;

    const aimed = aim?.aim
        ? aimView({ map, participants, rules }, aim, aim.aim)
        : null;

    const base = {
        map,
        rules,
        participants,
        actor,
        ...modeState,
        canAttack: actor.attackReady && canStartAttack(current),
        attacks: current?.battleData.attacks ?? [],
    };

    const { marks, steps, search } = buildMarks(base, aimed, modeView);

    const state: SceneState = { ...base, marks, steps, search };

    const hud: NonNullable<BattleMapView['hud']> = new Map(
        participants.map((p) => [
            p.basicInfo.id,
            { exact: canSeeExactStats(p, viewer) },
        ])
    );

    return {
        participants: participants.filter((p) => canSee(p, actor)),
        view: {
            selectedId: placing ? modeState.placingId : selectedId,
            currentId: current?.basicInfo.id ?? null,
            marks,
            range,
            ...(range &&
                aimCaster && { rangeCasterId: aimCaster.basicInfo.id }),
            reach:
                steps && search && current
                    ? { search, steps, moverId: current.basicInfo.id }
                    : null,
            trajectory: null,
            hud,
            ...(aimed && { aim: aimed.aim, pulseFrom: aimed.pulseFrom }),
        },
        aiming: !!aim,
        cellClick: (p) => cellClickOf(state, p),
        tokenClick: (id) => tokenClickOf(state, id),
    };
}
