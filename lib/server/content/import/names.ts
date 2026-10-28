import "server-only";
import { prisma } from "@/lib/db";
import type { IdName } from "@/types/common";
import type { ImportKind } from "@/types/content-import";

const args = (campaignId: string) => ({
  where: { campaignId },
  select: { id: true, name: true },
  orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
});

const LOADERS: Record<ImportKind, (campaignId: string) => Promise<IdName[]>> = {
  units: (c) => prisma.unit.findMany(args(c)),
  spells: (c) => prisma.spell.findMany(args(c)),
  skills: (c) => prisma.skill.findMany(args(c)),
  "main-skills": (c) => prisma.mainSkill.findMany(args(c)),
  "spell-groups": (c) => prisma.spellGroup.findMany(args(c)),
  races: (c) => prisma.race.findMany(args(c)),
  classes: (c) => prisma.gameClass.findMany(args(c)),
  backgrounds: (c) => prisma.background.findMany(args(c)),
  feats: (c) => prisma.feat.findMany(args(c)),
  artifacts: (c) => prisma.artifact.findMany(args(c)),
  "artifact-sets": (c) => prisma.artifactSet.findMany(args(c)),
};

export const loadNames = (campaignId: string, kind: ImportKind) => LOADERS[kind](campaignId);
