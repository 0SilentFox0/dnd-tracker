import "server-only";
import { prisma } from "@/lib/db";
import { tableOfKind as bundleTable } from "@/lib/server/templates/bundle";
import type { ImportKind } from "@/types/content-import";

export interface KeyRow { id: string; name: string; slug: string | null }

interface Delegate {
  findMany(args: unknown): Promise<KeyRow[]>;
  update(args: unknown): Promise<unknown>;
}

export const tableOfKind = (kind: ImportKind) => bundleTable(kind)!;

const delegateOf = (kind: ImportKind) => (prisma as unknown as Record<string, Delegate>)[tableOfKind(kind).delegate];

export const loadKeys = (campaignId: string, kind: ImportKind): Promise<KeyRow[]> =>
  delegateOf(kind).findMany({ where: { campaignId }, select: { id: true, name: true, slug: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

export async function writeSlug(campaignId: string, kind: ImportKind, id: string, slug: string): Promise<void> {
  await delegateOf(kind).update({ where: { id, campaignId }, data: { slug } });
}
