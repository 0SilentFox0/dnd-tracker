import { createHash, randomBytes } from "node:crypto";

import "server-only";
import { API_TOKEN_PREFIX, type ApiTokenScope, isApiTokenScope } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { isDmMember } from "@/lib/utils/api/is-dm";
import type { ApiTokenSummary, CreateApiTokenInput, CreatedApiToken } from "@/types/ai";

const SELECT = { id: true, name: true, prefix: true, scopes: true, executionMode: true, lastUsedAt: true, createdAt: true } as const;

const LAST_USED_THROTTLE_MS = 60_000;

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

const knownScopes = (raw: string[]): ApiTokenScope[] => raw.filter(isApiTokenScope);

const toSummary = (r: { id: string; name: string; prefix: string; scopes: string[]; lastUsedAt: Date | null; createdAt: Date; executionMode?: string }): ApiTokenSummary => ({
  ...r,
  executionMode: r.executionMode === "auto" ? "auto" : "review",
  scopes: knownScopes(r.scopes),
  lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export async function createApiToken(campaignId: string, userId: string, { name, scopes }: CreateApiTokenInput): Promise<CreatedApiToken> {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

  const row = await prisma.apiToken.create({
    data: { campaignId, userId, name, tokenHash: hashToken(token), prefix: token.slice(0, API_TOKEN_PREFIX.length + 4), scopes: [...scopes] },
    select: SELECT,
  });

  return { ...toSummary(row), token };
}

export async function listApiTokens(campaignId: string, userId: string): Promise<ApiTokenSummary[]> {
  const rows = await prisma.apiToken.findMany({ where: { campaignId, userId, revokedAt: null }, select: SELECT, orderBy: { createdAt: "desc" } });

  return rows.map(toSummary);
}

export async function revokeApiToken(campaignId: string, userId: string, tokenId: string): Promise<boolean> {
  return (await prisma.apiToken.updateMany({ where: { id: tokenId, campaignId, userId, revokedAt: null }, data: { revokedAt: new Date() } })).count > 0;
}

export async function verifyApiToken(raw: string): Promise<{ id: string; campaignId: string; userId: string; scopes: ApiTokenScope[] } | null> {
  if (!raw.startsWith(API_TOKEN_PREFIX)) return null;

  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { id: true, campaignId: true, userId: true, revokedAt: true, scopes: true },
  });

  if (!row || row.revokedAt) return null;

  const members = await prisma.campaignMember.findMany({ where: { campaignId: row.campaignId, userId: row.userId }, select: { role: true } });

  if (!isDmMember(members)) return null;

  await prisma.apiToken.updateMany({
    where: { id: row.id, OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: new Date(Date.now() - LAST_USED_THROTTLE_MS) } }] },
    data: { lastUsedAt: new Date() },
  });

  return { id: row.id, campaignId: row.campaignId, userId: row.userId, scopes: knownScopes(row.scopes) };
}
