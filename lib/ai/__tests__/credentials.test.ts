import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { aiCredential: { findUnique: vi.fn() } } }));

describe("loadApiKey", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
  });

  it("читає збережений ключ", async () => {
    const { encryptSecret } = await import("@/lib/ai/crypto");

    const { loadApiKey } = await import("@/lib/ai/credentials");

    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValue(encryptSecret("sk-abc") as never);
    expect(await loadApiKey("u", "openai")).toBe("sk-abc");
  });

  it("секрет змінився → AiKeyUnreadableError, а не сира помилка GCM", async () => {
    const { encryptSecret } = await import("@/lib/ai/crypto");

    const row = encryptSecret("sk-abc");

    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));

    const { AiKeyUnreadableError, loadApiKey } = await import("@/lib/ai/credentials");

    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValue(row as never);
    await expect(loadApiKey("u", "openai")).rejects.toBeInstanceOf(AiKeyUnreadableError);
  });

  it("немає рядка → null; немає секрету → AiNotConfiguredError", async () => {
    const { AiNotConfiguredError } = await import("@/lib/ai/crypto");

    const { loadApiKey } = await import("@/lib/ai/credentials");

    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValueOnce(null);
    expect(await loadApiKey("u", "openai")).toBeNull();

    vi.stubEnv("AI_KEYS_SECRET", "");
    vi.mocked(prisma.aiCredential.findUnique).mockResolvedValueOnce({ ciphertext: "x", iv: "AAAAAAAAAAAAAAAA", authTag: "AAAA", keyVersion: 1 } as never);
    await expect(loadApiKey("u", "openai")).rejects.toBeInstanceOf(AiNotConfiguredError);
  });
});
