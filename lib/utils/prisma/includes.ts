/**
 * Спільні Prisma `include` constants (CODE_AUDIT 2.6).
 *
 * Замість inline `{ inventory: true, characterSkills: { include: { skillTree: true } } }`
 * у ~20 місцях — використовуйте ці іменовані constants.
 *
 * Імплементовано як `as const satisfies Prisma.XxxInclude`, щоб TypeScript
 * правильно вивів типи відповіді (Prisma.XxxGetPayload<{ include: typeof CONST }>).
 */

import { Prisma } from "@prisma/client";

/** Character: повна форма з inventory + skill-tree progression. */
export const CHARACTER_FULL_INCLUDE = {
  inventory: true,
  characterSkills: {
    include: { skillTree: true },
  },
} as const satisfies Prisma.CharacterInclude;

/** Character: лише з inventory (для simple read). */
export const CHARACTER_WITH_INVENTORY_INCLUDE = {
  inventory: true,
} as const satisfies Prisma.CharacterInclude;

/** Campaign: з членами та їхніми user-профілями. */
export const CAMPAIGN_WITH_MEMBERS_INCLUDE = {
  members: {
    include: { user: true },
  },
} as const satisfies Prisma.CampaignInclude;

/** Skill: з усіма ralations для повного відображення. */
export const SKILL_FULL_INCLUDE = {
  spell: true,
  spellGroup: true,
  grantedSpell: true,
  mainSkill: true,
} as const satisfies Prisma.SkillInclude;

/** Artifact: з належним artifact set. */
export const ARTIFACT_WITH_SET_INCLUDE = {
  artifactSet: true,
} as const satisfies Prisma.ArtifactInclude;
