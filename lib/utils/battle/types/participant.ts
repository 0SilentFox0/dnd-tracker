import type { Prisma } from "@prisma/client";

import type { AttackType } from "@/lib/constants/battle";

export type ArtifactModifier = {
  type: string;
  value: number;
  isPercentage?: boolean;
};

export type ExtractedAttack = {
  id: string;
  name: string;
  type: AttackType;
  attackBonus: number;
  damageDice: string;
  damageType: string;
  range?: string;
  properties?: string;
  minTargets?: number;
  maxTargets?: number;
};

export type CharacterFromPrisma = Prisma.CharacterGetPayload<{
  include: {
    inventory?: true;
  };
}>;

export type UnitFromPrisma = Prisma.UnitGetPayload<Record<string, never>>;

/** Опціональний контекст для batch-завантаження (спільні дані кампанії) */
export interface CampaignSpellContext {
  skillTreeByRace: Record<string, Prisma.SkillTreeGetPayload<object> | null>;
  mainSkills: Array<{ id: string; spellGroupId: string | null; name: string }>;
  spells: Array<{ id: string; level: number; spellGroup?: { id: string } | null }>;
  allSkills: Array<Prisma.SkillGetPayload<object>>;
  racesByName: Record<string, Prisma.RaceGetPayload<object> | null>;
  campaign: { maxLevel: number };
  skillsById?: Record<string, Prisma.SkillGetPayload<object>>;
  artifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>;
  /** Сети артефактів (для бонусу повного комплекту без додаткових запитів). */
  artifactSetsById?: Record<
    string,
    { id: string; name: string; setBonus: unknown; icon?: string | null; abilities?: unknown }
  >;
  /** setId → усі id артефактів кампанії в цьому сеті */
  artifactSetMemberIds?: Record<string, string[]>;
}
