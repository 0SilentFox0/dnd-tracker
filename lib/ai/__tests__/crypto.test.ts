import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const key = () => randomBytes(32).toString("base64");

describe("ai crypto", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("AI_KEYS_SECRET", key());
  });

  afterEach(() => vi.unstubAllEnvs());

  it("повний цикл", async () => {
    const { decryptSecret, encryptSecret } = await import("@/lib/ai/crypto");

    const enc = encryptSecret("sk-ant-secret-1234");

    expect(enc.ciphertext).not.toContain("secret");
    expect(enc.keyVersion).toBe(1);
    expect(decryptSecret(enc)).toBe("sk-ant-secret-1234");
  });

  it("різний iv для однакового тексту", async () => {
    const { encryptSecret } = await import("@/lib/ai/crypto");

    expect(encryptSecret("x").iv).not.toBe(encryptSecret("x").iv);
  });

  it("підроблений authTag → помилка", async () => {
    const { decryptSecret, encryptSecret } = await import("@/lib/ai/crypto");

    const enc = encryptSecret("abc");

    expect(() => decryptSecret({ ...enc, authTag: Buffer.alloc(16).toString("base64") })).toThrow();
  });

  it("keyVersion 0 розшифровується AI_KEYS_SECRET_PREV", async () => {
    const prev = key();

    vi.stubEnv("AI_KEYS_SECRET", prev);

    const old = (await import("@/lib/ai/crypto")).encryptSecret("old-key");

    vi.resetModules();
    vi.stubEnv("AI_KEYS_SECRET", key());
    vi.stubEnv("AI_KEYS_SECRET_PREV", prev);

    const { decryptSecret } = await import("@/lib/ai/crypto");

    expect(decryptSecret({ ...old, keyVersion: 0 })).toBe("old-key");
  });

  it("без AI_KEYS_SECRET — isAiConfigured false і encrypt кидає AiNotConfiguredError", async () => {
    vi.stubEnv("AI_KEYS_SECRET", "");

    const { AiNotConfiguredError, encryptSecret, isAiConfigured } = await import("@/lib/ai/crypto");

    expect(isAiConfigured()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(AiNotConfiguredError);
  });
});
