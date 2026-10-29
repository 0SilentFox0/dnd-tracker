import type { battleOps } from "@/lib/api/battle-ops";
import type { DialogState } from "@/lib/hooks/battle/useAwaitingDmDialog";
import type { BattleLogHistory } from "@/lib/hooks/battle/useBattleLogHistory";
import type { BattleToastApi } from "@/lib/hooks/battle/useBattleToast";
import type { PusherConnectionState } from "@/lib/hooks/battle/usePusherBattleSync";
import type { BattleOpMutation } from "@/lib/hooks/battles";
import type { AttackIntent } from "@/lib/utils/battle/flows";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import type { Viewer } from "@/lib/utils/battle/view/visibility";
import type { BattleScene } from "@/types/api";
import type { ActiveEffect } from "@/types/battle";
import type { BattleLogPanel, BattleSceneResult, BattleSceneRoster, BattleSceneTurn, DmControl } from "@/types/battle-scene";

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
