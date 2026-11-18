import {
    type MAZE_DIFFICULTIES,
    type MAZE_MARK_SYMBOLS,
} from '@/lib/constants/battle';
import type { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import type { FxImpact } from '@/lib/utils/battle/fx';
import type { GridWindow } from '@/lib/utils/battle/grid/layout';
import type { ModeView } from '@/lib/utils/battle/modes/types';
import type { ZoneTrigger } from '@/lib/utils/spells/model/schema';
import type { ActiveEffect } from '@/types/battle';

export interface GridPoint {
    x: number;
    y: number;
}

export type Direction8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export type MazeDifficulty = (typeof MAZE_DIFFICULTIES)[number];

export type MazeMarkSymbol = (typeof MAZE_MARK_SYMBOLS)[number];

export interface MazeMark {
    symbol: MazeMarkSymbol;
    color: string;
    by: string;
}

export interface IllusionDisguise {
    name: string;
    avatar?: string;
    unitId?: string;
}

/** aSees — ким a бачить b; bSees — ким b бачить a */
export interface IllusionPair {
    a: string;
    b: string;
    aSees: IllusionDisguise;
    bSees: IllusionDisguise;
}

/** Герої однієї ілюзійної групи: disguise — образ, під яким інші бачать героя. */
export interface IllusionGroup {
    heroes: Array<{ id: string; disguise: IllusionDisguise }>;
}

/** walls — ребра "x:y:e" / "x:y:s"; fog і marks — за ключем клітинки "x:y" */
export interface MazeConfig {
    walls: string[];
    exit: GridPoint | null;
    difficulty: MazeDifficulty;
    teleports: [GridPoint, GridPoint][];
    fog: string[];
    marks: Record<string, MazeMark>;
    dark: boolean;
    /** перший крок героя зроблено: «Згенерувати»/«Розкидати старти» більше недоступні */
    moved?: boolean;
    illusionSwap?: { pairs?: IllusionPair[]; groups?: IllusionGroup[] };
}

export type TemplateShape =
    | 'circle'
    | 'cube'
    | 'cone'
    | 'line'
    | 'cross'
    | 'emanation';

/** size у футах: радіус кола, сторона куба, довжина конуса/лінії, промінь хреста */
export interface SpellTemplate {
    shape: TemplateShape;
    size: number;
    /** Кільце: клітинка прицілу кола не вражається */
    hollow?: boolean;
    /** 5e: euclidean disk rather than the legacy square */
    exact?: boolean;
}

export type MapMotionAxis = 'x' | 'y';

/** speed — клітинки/с зі знаком; 0 — зупинено, відсутнє або null — вимкнено */
export interface MapMotion {
    axis: MapMotionAxis;
    speed: number;
}

export type WeatherKind = (typeof WEATHER_KINDS)[number];

/** Карта бою: сітка поверх фону; клітинка = 5 футів */
export interface BattleMapConfig {
    cols: number;
    rows: number;
    background: string | null;
    source?: {
        url: string;
        attribution: string;
        license: 'CC-BY-SA-4.0';
    };
    /** Прозорість ліній сітки, 0..1 */
    opacity: number;
    /** Неігрові клітинки (ключі "x:y") */
    blocked?: string[];
    /** Місцевість за ключем "x:y" */
    terrain?: Record<string, TerrainCell>;
    /** Тригери зон заклинань за TerrainCell.zoneId; клієнту не потрібні, лише серверу */
    spellZones?: Record<string, SpellZoneRuntime>;
    /** Ширина фону в клітинках (з повзунка «Розмір клітинки»); без неї фон вписується в cols×rows */
    backgroundCols?: number;
    /** Висота фону в клітинках; без неї береться з пропорцій зображення (клітинки фону квадратні) */
    backgroundRows?: number;
    /** Зсув сітки відносно фону, частки клітинки 0 ≤ v < 1 */
    gridOffset?: { x: number; y: number };
    maze?: MazeConfig | null;
    /** Стіни на ребрах ("x:y:e" / "x:y:s"): блокують рух, погляд і вогонь */
    walls?: string[];
    /** Ґрати на ребрах: блокують лише рух */
    bars?: string[];
    /** Початковий стан дверей на ребрах; зачинені блокують як стіни, бойовий стан — у `BattleMapState.doors` */
    doors?: Record<string, DoorState>;
    /** Атмосфера без механіки; відсутня або null — ясно */
    weather?: WeatherKind | null;
    motion?: MapMotion | null;
}

export interface DoorState {
    open: boolean;
    locked?: boolean;
}

export type FogMode = 'off' | 'reveal' | 'vision';

export type RevealedRun = readonly [y: number, startX: number, endX: number];

export interface FogState {
    mode: FogMode;
    revealed: RevealedRun[];
    visionRadius: number;
}

/** Мінливий шар карти бою поверх незмінної карти: видалені ребра, двері, туман */
export interface BattleMapState {
    removedEdges: string[];
    doors: Record<string, DoorState>;
    fog?: FogState;
}

/** Патч стану за ключем; null у doors = прибрати двері */
export interface MapStateDelta {
    removed?: { add: string[]; remove: string[] };
    doors?: Record<string, DoorState | null>;
    fog?: {
        mode?: FogMode;
        visionRadius?: number;
        revealed?: { add: RevealedRun[]; remove: RevealedRun[] };
    };
}

/** Власні ребра inline-карти, як вони лежать у battle_scenes.map */
export interface MapBase {
    walls?: string[];
    bars?: string[];
}

/** Бій посилається на pinned-версію бібліотечної карти */
export interface BattleMapRef {
    mapId: string;
    version: number;
}

/** difficult — лише пензель ДМ (прохідна складна місцевість); зони заклинань ставлять прапорці на hazard */
export type TerrainKind = 'wall' | 'barrier' | 'hazard' | 'difficult';

export interface AnchoredZoneState {
    casterId: string;
    spellId: string;
    spellName: string;
    dc?: number;
    radiusFeet: number;
    side: 'enemies' | 'allies' | 'all';
    excludeBearer?: boolean;
    onEnter?: ZoneTrigger;
    onTurnStart?: ZoneTrigger;
    endsWhenStartOutside?: boolean;
    attackBonus?: number;
}

export interface PendingHit {
    id: string;
    targetId: string;
    atRound: number;
    amount: number;
    damageType: string;
    spellName: string;
    school: string | null;
}

export interface SpellZoneRuntime {
    casterId: string;
    spellId: string;
    spellName: string;
    dc?: number;
    side: 'enemies' | 'all';
    centre?: GridPoint;
    triggers: {
        onEnter?: ZoneTrigger;
        onTurnStart?: ZoneTrigger;
        onExit?: ZoneTrigger;
    };
    untilRound: number;
    concentrationOf?: { casterId: string; castId: string };
}

/** type — тип шкоди (fire, cold…) */
export interface TerrainDamage {
    dice?: string;
    amount?: number;
    type: string;
    /** Небезпека від заклинання: імунітет і опори до заклинань діють, як при касті */
    spellId?: string;
    /** Кастер зони: зі станом «не завдає шкоди» зона шкоди не заподіює */
    casterId?: string;
    /** Небезпека тримається, поки кастер концентрується на закляттi castId */
    concentrationOf?: { casterId: string; castId: string };
}

export interface TerrainCell {
    kind: TerrainKind;
    label?: string;
    /** Барʼєр або небезпека діє до кінця цього раунду */
    untilRound?: number;
    damage?: TerrainDamage;
    /** Вхід у клітинку коштує подвійний рух */
    difficult?: true;
    /** Сильно заслонена: хто в ній або дивиться в неї, не бачить */
    obscured?: true;
    /** Зона заклинання, якій належить клітинка */
    zoneId?: string;
}

/** зміни місцевості в дельті: однакові значення згруповані, щоб підпис не повторювався на кожній клітинці */
export interface TerrainDiff {
    set?: { cell: TerrainCell; keys: string[] }[];
    removed?: string[];
}

export type BattleMapMark =
    | 'move'
    | 'move-danger'
    | 'target'
    | 'invalid-target'
    | 'template'
    | 'pick'
    | 'picked';

export interface BattleMapView {
    camera?: { follow: boolean; selfId: string | null };
    selectedId?: string | null;
    currentId?: string | null;
    /** cellKey → позначка; число — досяжна клітинка (вартість руху, не показується) */
    marks?: Map<string, BattleMapMark | number>;
    /** клітинки в межах дальності прицілу; поза ним затемнено */
    range?: GridWindow | null;
    /** Підказка атаки при наведенні: дальня — лінія до клітинки, ближня — меч на цілі; cover — клітинки перешкоди (порожньо — заважає стіна лабіринту), відсутній — лінія вільна */
    trajectory?: {
        fromId: string;
        targetId: string;
        to: GridPoint;
        kind: 'melee' | 'ranged';
        cover?: string[];
    } | null;
    /** Точка наведення шаблону заклинання */
    aim?: GridPoint | null;
    /** Звідки біжить хвиля пульсу превʼю шаблону */
    pulseFrom?: GridPoint | null;
    /** Плашка під токеном: без запису — exact */
    hud?: Map<string, { exact: boolean }>;
    /** Учасник, якому доступне «Повернутися» (удар і повернення) */
    returnId?: string | null;
    /** Клітинки надісланих штрихів місцевості до відповіді сервера */
    pendingStroke?: ReadonlySet<string>;
    /** Поточний раунд — для «ще N р.» на тимчасовій небезпеці */
    round?: number;
    /** Удар останньої дії по учаснику: рамка, спалах і тремтіння токена в момент влучання */
    impactFor?: (participantId: string) => FxImpact | null;
    /** Ефекти для аур на токенах (той самий набір, що й у списку) */
    effects?: ReadonlyMap<string, readonly ActiveEffect[]>;
    /** Що з режиму карти бачить глядач; null — звичайна карта */
    mode?: ModeView | null;
}

export interface BattleMapActions {
    onCellClick?: (p: GridPoint) => void;
    onCellHover?: (p: GridPoint | null) => void;
    onTokenClick?: (id: string) => void;
    onStroke?: (cells: GridPoint[]) => void;
    onReturn?: () => void;
}
