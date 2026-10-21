import "server-only";
import { AiNotConfiguredError, decryptSecret, encryptSecret } from "@/lib/ai/crypto";
import type { AiProvider } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";
import type { AiCredentialSummary } from "@/types/ai";

const SUMMARY = { provider: true, last4: true, defaultModel: true, updatedAt: true } as const;

const toSummary = (r: { provider: string; last4: string; defaultModel: string | null; updatedAt: Date }): AiCredentialSummary => ({
  provider: r.provider as AiProvider,
  last4: r.last4,
  defaultModel: r.defaultModel,
  updatedAt: r.updatedAt.toISOString(),
});

export async function listCredentials(userId: string): Promise<AiCredentialSummary[]> {
  const rows = await prisma.aiCredential.findMany({ where: { userId }, select: SUMMARY, orderBy: { provider: "asc" } });

  return rows.map(toSummary);
}

export async function saveCredential(userId: string, provider: AiProvider, apiKey: string, defaultModel: string | null): Promise<AiCredentialSummary> {
  const enc = encryptSecret(apiKey);

  const data = { ...enc, last4: apiKey.slice(-4), defaultModel };

  const row = await prisma.aiCredential.upsert({ where: { userId_provider: { userId, provider } }, create: { userId, provider, ...data }, update: data, select: SUMMARY });

  return toSummary(row);
}

export async function setDefaultModel(userId: string, provider: AiProvider, defaultModel: string | null): Promise<AiCredentialSummary | null> {
  const { count } = await prisma.aiCredential.updateMany({ where: { userId, provider }, data: { defaultModel } });

  if (count === 0) return null;

  const row = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } }, select: SUMMARY });

  return row && toSummary(row);
}

export async function deleteCredential(userId: string, provider: AiProvider): Promise<void> {
  await prisma.aiCredential.deleteMany({ where: { userId, provider } });
}

export class AiKeyUnreadableError extends Error {
  constructor() {
    super("stored AI key cannot be decrypted");
    this.name = "AiKeyUnreadableError";
  }
}

export async function loadApiKey(userId: string, provider: AiProvider): Promise<string | null> {
  const row = await prisma.aiCredential.findUnique({ where: { userId_provider: { userId, provider } }, select: { ciphertext: true, iv: true, authTag: true, keyVersion: true } });

  if (!row) return null;

  try {
    return decryptSecret(row);
  } catch (error) {
    if (error instanceof AiNotConfiguredError) throw error;

    throw new AiKeyUnreadableError();
  }
}
