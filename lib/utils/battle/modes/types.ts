import type { BattleSceneState, NewBattleEvent, ScenePatch } from "@/lib/utils/battle/store/types";
import type { BattleAction, BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

/** Що бачить глядач у режимі; null у хуках — бачить усе. */
export interface ModeView {
  cells: ReadonlySet<string> | null;
  visibleIds: ReadonlySet<string>;
  ownIds: ReadonlySet<string>;
  showDormant: boolean;
  dark: boolean;
}

export interface ModeAwareOutcome {
  participants: BattleParticipant[];
  events?: NewBattleEvent[];
  scene?: ScenePatch;
}

export interface ModeServerHooks<C> {
  /** Учасники на старті й перший хід (сон, погляд); турн-індекс — перший, хто ходить. */
  onStart?(args: { map: BattleMapConfig; config: C; order: BattleParticipant[] }): { participants: BattleParticipant[]; turnIndex: number };
  /** Після кожної не-dryRun мутації (пробудження, події «помітили»). */
  afterMutation?<T extends ModeAwareOutcome>(args: { map: BattleMapConfig; config: C; scene: { status: BattleSceneState["status"]; round: number }; result: T }): T;
  /** Текст відмови для роутів з опцією blockedByMode, або null. */
  blockedText?(config: C): string | null;
  /** Хід пропускається з цим записом журналу, або null. */
  autoSkipText?(config: C): string | null;
  /** Розставити всіх (заміщує звичайну розстановку). */
  placeAll?(args: { map: BattleMapConfig; config: C; participants: BattleParticipant[] }): BattleParticipant[];
  /** Поставити одного на клітинку; кидає BattleRuleError з текстом відмови. */
  placeOne?(args: { map: BattleMapConfig; config: C; participants: BattleParticipant[]; mover: BattleParticipant; to: GridPoint }): BattleParticipant;
  /** Учасник з'являється в бою (додано ДМ чи відкрито резерв). */
  onEnter?(args: { config: C; participant: BattleParticipant }): BattleParticipant;
  /** Конфіг після скидання бою. */
  onReset?(config: C): C;
  /** Поля battleData режиму для дельти (додаються до PATCHABLE_PARTICIPANT_FIELDS). */
  patchableFields?: readonly string[];
}

export interface ModeEngineHooks<C> {
  /** Власник бачить ціль (масові вміння, заклинання «всім»). Відсутній — бачить. */
  sees?(args: { config: C; map: BattleMapConfig; viewer: BattleParticipant; target: BattleParticipant }): boolean;
  /** Текст відмови, якщо клітинку прицілу не видно. */
  aimHiddenText?(args: { config: C; map: BattleMapConfig; caster: BattleParticipant; cell: GridPoint }): string | null;
  /** Текст відмови, якщо хоч одну ціль не видно. */
  targetHiddenText?(args: { config: C; map: BattleMapConfig; caster: BattleParticipant; targets: BattleParticipant[] }): string | null;
  /** Ближня атака заблокована (стіна) — текст або null. */
  meleeBlockedText?(args: { config: C; map: BattleMapConfig; attacker: BattleParticipant; target: BattleParticipant }): string | null;
  /** Чи «зв'язує» сусід стрільця (звичайно — isActive). */
  engages?(args: { config: C; map: BattleMapConfig; attacker: BattleParticipant; neighbour: BattleParticipant }): boolean;
}

export interface ModeClientHooks<C> {
  /** Поля, що змінились (без важких), undefined — без змін, null — потрібна повна карта. */
  deltaOf?(before: C | null | undefined, after: C | null | undefined): Partial<C> | null | undefined;
  mergeDelta?(cached: C, patch: Partial<C>): C;
  logVisible?(view: ModeView | null | undefined, e: BattleAction): boolean;
  fxVisible?(view: ModeView | null | undefined, e: BattleAction): boolean;
}

export interface MapModeDefinition<C = unknown> {
  key: string;
  configOf(map: BattleMapConfig | null | undefined): C | null;
  /** Карта з новим конфігом (null — вимкнути режим). */
  withConfig(map: BattleMapConfig, config: C | null): BattleMapConfig;
  server: ModeServerHooks<C>;
  engine: ModeEngineHooks<C>;
  client: ModeClientHooks<C>;
}
