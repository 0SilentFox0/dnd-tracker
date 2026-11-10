import "server-only";
import { prisma } from "@/lib/db";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import type { ImportKind } from "@/types/content-import";

export interface KeyRow { id: string; name: string; slug: string | null }

const TABLE_OF_KIND: Record<ImportKind, (typeof BUNDLE_TABLES)[number]["key"]> = {
  units: "units",
  spells: "spells",
  skills: "skills",
  "main-skills": "mainSkills",
  "spell-groups": "spellGroups",
  races: "races",
  classes: "classes",
  backgrounds: "backgrounds",
  careers: "careers",
  feats: "feats",
  artifacts: "artifacts",
  "artifact-sets": "artifactSets",
};

interface Delegate {
  findMany(args: unknown): Promise<KeyRow[]>;
  update(args: unknown): Promise<unknown>;
}

const delegateOf = (kind: ImportKind) => (prisma as unknown as Record<string, Delegate>)[BUNDLE_TABLES.find((t) => t.key === TABLE_OF_KIND[kind])!.delegate];

export const loadKeys = (campaignId: string, kind: ImportKind): Promise<KeyRow[]> =>
  delegateOf(kind).findMany({ where: { campaignId }, select: { id: true, name: true, slug: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

export async function writeSlug(campaignId: string, kind: ImportKind, id: string, slug: string): Promise<void> {
  await delegateOf(kind).update({ where: { id, campaignId }, data: { slug } });
}
