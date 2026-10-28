import type { CritKind, CritSource } from "./catalog";

import type { CriticalEffect } from "@/lib/constants/critical-effects";

export interface CritTriggerInfo {
  source: CritSource;
  kind: CritKind;
  actorId: string;
  targetId: string;
}

export interface CritTrigger extends CritTriggerInfo {
  key: string;
}

export type CritPicker = (info: CritTriggerInfo) => CriticalEffect;

export interface PendingCritChoice {
  action: "attack" | "spell";
  actorId: string;
  triggers: CritTrigger[];
}

export interface StoredPendingCritChoice extends PendingCritChoice {
  request: unknown;
  seed: number;
  userId: string;
  isDM: boolean;
}

export interface CritResume {
  seed: number;
  /** key тригера → id ефекту */
  choices: Record<string, number>;
}
