import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/ai/providers", () => ({ verifyProviderKey: vi.fn(async () => "ok") }));
vi.mock("@/lib/db", () => ({
  prisma: { aiCredential: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() } },
}));

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (provider: string) => ({ params: Promise.resolve({ provider }) }) as never;

const route = () => import("@/app/api/ai/credentials/[provider]/route");

describe("AI credentials API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
    vi.mocked(apiAuth.requireAuth).mockResolvedValue({ userId: "u1" });
    vi.mocked(prisma.aiCredential.upsert).mockImplementation((async ({ create }: { create: Record<string, unknown> }) => ({ ...create, updatedAt: new Date() })) as never);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("без сесії — 401", async () => {
    vi.mocked(apiAuth.requireAuth).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 401 }));

    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("anthropic"))).status).toBe(401);
  });

  it("ключ з пробілами: trim, last4 з обрізаного, у відповіді немає ключа і шифротексту", async () => {
    const { PUT } = await route();

    const res = await PUT(req("PUT", { apiKey: "  sk-ant-abcdefgh9876 \n" }), params("anthropic"));

    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.last4).toBe("9876");
    expect(JSON.stringify(body)).not.toContain("sk-ant");
    expect(body).not.toHaveProperty("ciphertext");

    const create = vi.mocked(prisma.aiCredential.upsert).mock.calls[0][0].create as Record<string, unknown>;

    expect(create.ciphertext).toBeTypeOf("string");
    expect(JSON.stringify(create)).not.toContain("abcdefgh");
  });

  it("невалідний ключ — 400, нічого не збережено", async () => {
    const { verifyProviderKey } = await import("@/lib/ai/providers");

    vi.mocked(verifyProviderKey).mockResolvedValueOnce("invalid");

    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("anthropic"))).status).toBe(400);
    expect(prisma.aiCredential.upsert).not.toHaveBeenCalled();
  });

  it("невідомий провайдер — 404", async () => {
    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("mistral"))).status).toBe(404);
  });

  it("невідома модель — 400", async () => {
    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890", defaultModel: "gpt-x" }), params("anthropic"))).status).toBe(400);
  });

  it("без AI_KEYS_SECRET — 503", async () => {
    vi.stubEnv("AI_KEYS_SECRET", "");

    const { PUT } = await route();

    expect((await PUT(req("PUT", { apiKey: "sk-ant-1234567890" }), params("anthropic"))).status).toBe(503);
  });
});
