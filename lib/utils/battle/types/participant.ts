import type { Prisma } from "@prisma/client";

import type { AttackType } from "@/lib/constants/battle";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import type { Ruleset } from "@/lib/utils/rules";
import type { BackgroundData } from "@/types/backgrounds";
import type { FeatData } from "@/types/choices";
import type { GameClassData } from "@/types/classes";

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
  traits?: WeaponTrait[];
  versatileDice?: string;
  hand?: "off";
  damageBonus?: number;
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
  mainSkills: Array<{ id: string; spellGroupId: string | null; name: string; role: string | null }>;
  spells: Array<{ id: string; level: number; spellGroup?: { id: string } | null }>;
  allSkills: Array<Prisma.SkillGetPayload<object>>;
  racesByName: Record<string, Prisma.RaceGetPayload<object> | null>;
  campaign: { maxLevel: number };
  rules: Ruleset;
  classesById?: Record<string, GameClassData>;
  /** Refs цієї кампанії; undefined потребує fallback, {} означає завантажену порожню map. */
  featsById?: Record<string, FeatData>;
  backgroundsById?: Record<string, BackgroundData>;
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
