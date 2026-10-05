import type { AbilityUsageCounter } from "@/types/abilities";
import type { BattleParticipant, BattlePreparationParticipant } from "@/types/battle";

export type BattleStatus = "prepared" | "active" | "completed";

export interface BattleSceneState {
  id: string;
  campaignId: string;
  status: BattleStatus;
  round: number;
  turnIndex: number;
  version: number;
  eventSeq: number;
  pendingMoraleCheck: unknown | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface ParticipantColumns {
  id: string;
  sourceType: string;
  sourceId: string;
  side: string;
  controlledBy: string;
  orderIndex: number;
  isPending: boolean;
  extraTurnOf: string | null;
  currentHp: number;
  tempHp: number;
  maxHp: number;
  morale: number;
  status: string;
  initiative: number;
  hasUsedAction: boolean;
  hasUsedBonusAction: boolean;
  hasUsedReaction: boolean;
  hasExtraTurn: boolean;
}

export type ParticipantSnapshot = Record<string, unknown>;

export interface ParticipantState {
  activeEffects: unknown[];
  abilityUsage?: Record<string, AbilityUsageCounter>;
  /** лише в рядках, збережених до 3a */
  skillUsageCounts?: Record<string, number>;
  pendingExtraActions?: number;
  spellSlotsCurrent: Record<string, number>;
}

export interface StoredParticipant {
  columns: ParticipantColumns;
  snapshot: ParticipantSnapshot;
  state: ParticipantState;
  snapshotHash: string;
}

export interface NewBattleEvent {
  type: string;
  round: number;
  actorId?: string | null;
  targets?: unknown[];
  details?: Record<string, unknown>;
  hpChanges?: unknown[];
  resultText: string;
}

export interface StoredBattleEvent extends Required<Omit<NewBattleEvent, "actorId">> {
  seq: number;
  actorId: string | null;
}

export interface BattleMeta {
  name: string;
  description: string | null;
  setup: BattlePreparationParticipant[];
  friendlyFire: boolean;
  createdAt: Date;
}

export type HistoryChange = { cancelFromSeq: number } | { clear: true };

export interface LoadedBattle {
  scene: BattleSceneState;
  meta: BattleMeta;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  isDM: boolean;
}

export type ScenePatch = Partial<
  Pick<BattleSceneState, "status" | "round" | "turnIndex" | "pendingMoraleCheck" | "startedAt" | "completedAt">
>;

export interface BattleMutationOutcome {
  scene?: ScenePatch;
  participants: BattleParticipant[];
  pending: BattleParticipant[];
  events: NewBattleEvent[];
  history?: HistoryChange;
}

export interface BattleDelta {
  battleId: string;
  version: number;
  scene: Pick<BattleSceneState, "status" | "round" | "turnIndex" | "pendingMoraleCheck">;
  upserted: BattleParticipant[];
  removed: string[];
  events: StoredBattleEvent[];
}
