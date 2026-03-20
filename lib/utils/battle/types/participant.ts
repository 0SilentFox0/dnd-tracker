/**
 * Типи для створення та роботи з BattleParticipant
 */

import type { Prisma } from "@prisma/client";

import type { AttackType } from "@/lib/constants/battle";

/** Модифікатор артефакта */
export type ArtifactModifier = {
  type: string;
  value: number;
  isPercentage?: boolean;
};

/** Атака, витягнута з екіпірованої зброї */
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

/** Character з Prisma (з include для inventory, characterSkills) */
export type CharacterFromPrisma = Prisma.CharacterGetPayload<{
  include: {
    inventory?: true;
    characterSkills?: {
      include: { skillTree?: true };
    };
  };
}>;

/** Unit з Prisma */
export type UnitFromPrisma = Prisma.UnitGetPayload<Record<string, never>>;

/** Опціональний контекст для batch-завантаження (спільні дані кампанії) */
export interface CampaignSpellContext {
  skillTreeByRace: Record<string, Prisma.SkillTreeGetPayload<object> | null>;
  mainSkills: Array<{ id: string; spellGroupId: string | null; name: string }>;
  spells: Array<
    Prisma.SpellGetPayload<{
      include: { spellGroup: { select: { id: true } } };
    }>
  >;
  allSkills: Array<
    Prisma.SkillGetPayload<{
      include: { spellGroup: { select: { id: true } } };
    }>
  >;
  racesByName: Record<string, Prisma.RaceGetPayload<object> | null>;
  campaign: { maxLevel: number };
  skillsById?: Record<string, Prisma.SkillGetPayload<object>>;
  artifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>;
  /** Сети артефактів (для бонусу повного комплекту без додаткових запитів). */
  artifactSetsById?: Record<
    string,
    { id: string; name: string; setBonus: unknown }
  >;
  /** setId → усі id артефактів кампанії в цьому сеті */
  artifactSetMemberIds?: Record<string, string[]>;
}
