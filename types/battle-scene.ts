import type { battleOps } from "@/lib/api/battle-ops";
import type { DialogState } from "@/lib/hooks/battle/useAwaitingDmDialog";
import type { BattleLogHistory } from "@/lib/hooks/battle/useBattleLogHistory";
import type { BattleToastApi } from "@/lib/hooks/battle/useBattleToast";
import type { PusherConnectionState } from "@/lib/hooks/battle/usePusherBattleSync";
import type { BattleOpMutation } from "@/lib/hooks/battles";
import type { AttackIntent } from "@/lib/utils/battle/flows";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import type { CritEffectFx, QueueEntry, RetaliationOutcome, Viewer } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export type { DialogState };

/** Удар по одній цілі багатоцільової атаки */
export interface StrikeFx {
  targetName: string;
  kind: "hit" | "crit" | "miss";
  damage: number;
  downed: boolean;
  splash?: boolean;
}

export type ResultFx =
  | { kind: "hit" | "crit"; targetName: string; damage: number; downed: boolean; d20: number; weapon?: string; retaliation?: RetaliationOutcome; critEffect?: CritEffectFx; strikes?: StrikeFx[] }
  | { kind: "miss"; targetName: string; d20: number; known: string; retaliation?: RetaliationOutcome; critFail?: CritEffectFx; strikes?: StrikeFx[] }
  | { kind: "spell"; spellName: string; changes: { name: string; change: number }[]; targetCount: number }
  | { kind: "morale-extra" | "morale-skip"; name: string; d10: number; morale: number };

export type ActionResultFx = Extract<ResultFx, { kind: "hit" | "crit" | "miss" | "spell" }>;

export interface BattleLogState {
  open: boolean;
  focus: number | null;
}

export interface BattleLogPanel extends BattleLogState {
  show(focus?: number | null): void;
  close(): void;
}

/** Наміри гравця, що їх карта передає майстрам (не мутації — ті в `actions`). */
export interface BattleSceneIntents {
  attack: AttackIntent | null;
  requestAttack(intent: AttackIntent): void;
  clearAttack(): void;
  /** Наведення шаблону заклинання на карті: клік по клітинці ставить точку замість руху чи атаки */
  mapAim: MapAim | null;
  setMapAim(aim: MapAim | null): void;
  /** Вибір цілей заклинання на карті: клік по токену обирає ціль замість руху чи атаки */
  mapPick: MapPick | null;
  setMapPick(pick: MapPick | null): void;
  /** Фаза ходу поточного героя дозволяє атаку — лише тоді клік по ворогу стає наміром, а не вибором */
  attackReady: boolean;
  /** MyTurnControls повідомляє id героя, чия фаза дозволяє атаку; null — не дозволяє */
  setAttackReady(heroId: string | null): void;
}

export type BattleSceneActions = { [K in keyof typeof battleOps]: BattleOpMutation<K> };

export interface BattleSceneTurn {
  current: BattleParticipant | null;
  isMyTurn: boolean;
  queue: QueueEntry[];
}

export interface BattleSceneRoster {
  allies: BattleParticipant[];
  enemies: BattleParticipant[];
  reserve: BattleParticipant[];
  myParticipants: BattleParticipant[];
  hero: BattleParticipant | null;
}

export interface DmControl {
  id: string | null;
  set(id: string | null): void;
}

/** Змінюється лише разом з даними бою — список учасників, черга, герой. */
export interface BattleSceneData {
  campaignId: string;
  battleId: string;
  battle: BattleScene;
  viewer: Viewer;
  turn: BattleSceneTurn;
  roster: BattleSceneRoster;
  awaiting: "victory" | "defeat" | null;
  effects: Map<string, ActiveEffect[]>;
  dmControl: DmControl;
  select(id: string | null): void;
  /** Клік по учаснику в списку: ворог у свій хід — атака, інакше — вибір */
  clickParticipant(id: string): void;
  readBattle(): BattleScene | undefined;
}

export interface BattleSceneDialogs {
  awaitingDm: DialogState;
  resultScreen: DialogState;
}

export interface BattleSceneResult {
  fx: ResultFx | null;
  show(fx: ResultFx | null): void;
}

export interface BattleSceneValue extends BattleSceneData {
  dialogs: BattleSceneDialogs;
  connection: PusherConnectionState;
  selectedId: string | null;
  intents: BattleSceneIntents;
  toast: BattleToastApi;
  result: BattleSceneResult;
  log: BattleLogPanel;
  logHistory: BattleLogHistory;
  actions: BattleSceneActions;
  anyPending: boolean;
}
