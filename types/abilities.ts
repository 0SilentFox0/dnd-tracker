import { AttackType } from "@/lib/constants/battle";
import type { Ability, DamageKind, StaticEffect } from "@/lib/utils/abilities/schema";

export type { Ability, StaticEffect };

export interface AbilitySource {
  type: "skill" | "race" | "artifact" | "artifactSet" | "unit" | "character";
  id: string;
  name: string;
  icon?: string | null;
  line?: { mainSkillId: string; level: string; levelNode?: boolean };
}

export type ResolvedAbility = Ability & { key: string; source: AbilitySource };

export interface AbilityUsageCounter {
  battle: number;
  round: number;
  turn: number;
}

export interface SpellEnhancer {
  skillId: string;
  name: string;
  mainSkillId: string | null;
  level: string | null;
  linkedSpellId: string | null;
  spellGroupId: string | null;
  spellEnhancements: {
    spellEffectIncrease?: number;
    spellTargetChange?: { target: string };
    spellAdditionalModifier?: { modifier?: string; damageDice?: string; duration?: number };
    spellNewSpellId?: string;
    spellAllowMultipleTargets?: boolean;
    spellAoeSpellIds?: string[];
  };
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
  | { type: "spellCast"; phase: "before" | "after"; actorId: string; targetIds: string[]; spellId?: string; school?: string | null; level?: number }
  | { type: "moraleCheck"; actorId: string; result: "success" | "fail" }
  | { type: "bonusAction"; actorId: string; abilityKey: string; targetId?: string };

export type AbilityDamageKind = DamageKind;

export interface AbilitySourceRef {
  kind: "skill" | "race" | "artifact" | "artifactSet" | "unit";
  id: string;
  name: string;
}
