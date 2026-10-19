import { AttackType } from "@/lib/constants/battle";
import type { Ability, DamageKind, StaticEffect } from "@/lib/utils/abilities/schema";
import type { GridPoint } from "@/types/battle";

export type { Ability, StaticEffect };

export interface AbilitySource {
  type: "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character";
  id: string;
  name: string;
  icon?: string | null;
  line?: { mainSkillId: string; level: string; levelNode?: boolean };
  /** персональне вміння героя (поза деревом) */
  personal?: boolean;
}

export type ResolvedAbility = Ability & { key: string; source: AbilitySource };

export interface AbilityUsageCounter {
  battle: number;
  round: number;
  turn: number;
  lastRound?: number;
}

export type AbilityEvent =
  | { type: "battleStart"; newcomerIds?: string[] }
  | { type: "roundStart" }
  | { type: "roundEnd" }
  | { type: "turnStart"; actorId: string }
  | { type: "turnEnd"; actorId: string }
  | { type: "attack"; phase: "before" | "after"; actorId: string; targetId: string; attackKind: AttackType }
  | { type: "hit"; actorId: string; targetId: string; attackKind: AttackType; damage: number }
  | { type: "kill"; actorId: string | null; targetId: string }
  | { type: "lethalDamage"; actorId: string | null; targetId: string }
  | { type: "spellCast"; phase: "before" | "after"; actorId: string; targetIds: string[]; spellId?: string; school?: string | null; level?: number; roll?: number }
  | { type: "moraleCheck"; actorId: string; result: "success" | "fail" }
  | { type: "bonusAction"; actorId: string; abilityKey: string; targetIds?: string[]; targetCell?: GridPoint }
  | { type: "action"; actorId: string; abilityKey: string; targetIds?: string[]; targetCell?: GridPoint };

export type AbilityDamageKind = DamageKind;

export interface AbilitySourceRef {
  kind: "skill" | "race" | "artifact" | "artifactSet" | "unit";
  id: string;
  name: string;
}
