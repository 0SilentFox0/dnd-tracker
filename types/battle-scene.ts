import type { CritEffectFx } from "@/lib/utils/battle/view/crit-outcome";
import type { QueueEntry } from "@/lib/utils/battle/view/queue";
import type { RetaliationOutcome } from "@/lib/utils/battle/view/retaliation";
import type { BattleParticipant } from "@/types/battle";

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

export interface BattleSceneResult {
  fx: ResultFx | null;
  show(fx: ResultFx | null): void;
}
