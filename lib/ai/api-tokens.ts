import { createHash, randomBytes } from "node:crypto";

import "server-only";
import { API_TOKEN_PREFIX, API_TOKEN_SCOPES } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import { isDmMember } from "@/lib/utils/api/is-dm";
import type { ApiTokenSummary, CreatedApiToken } from "@/types/ai";

const SELECT = { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true } as const;

const LAST_USED_THROTTLE_MS = 60_000;

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

const toSummary = (r: { id: string; name: string; prefix: string; lastUsedAt: Date | null; createdAt: Date }): ApiTokenSummary => ({
  ...r,
  lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export async function createApiToken(campaignId: string, userId: string, name: string): Promise<CreatedApiToken> {
  const token = `${API_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;

  const row = await prisma.apiToken.create({
    data: { campaignId, userId, name, tokenHash: hashToken(token), prefix: token.slice(0, API_TOKEN_PREFIX.length + 4), scopes: [...API_TOKEN_SCOPES] },
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

export async function verifyApiToken(raw: string): Promise<{ campaignId: string; userId: string } | null> {
  if (!raw.startsWith(API_TOKEN_PREFIX)) return null;

  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { id: true, campaignId: true, userId: true, revokedAt: true, lastUsedAt: true },
  });

  if (!row || row.revokedAt) return null;

  const members = await prisma.campaignMember.findMany({ where: { campaignId: row.campaignId, userId: row.userId }, select: { role: true } });

  if (!isDmMember(members)) return null;

  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    await prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  }

  return { campaignId: row.campaignId, userId: row.userId };
}
