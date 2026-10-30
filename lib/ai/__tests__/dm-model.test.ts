import { beforeEach, describe, expect, it, vi } from "vitest";

import { pickDmImageModel, pickDmSmartTextModel, pickDmTextModel, readDmAiAvailability, readDmSmartAvailability } from "../dm-model";

import { prisma } from "@/lib/db";

const h = vi.hoisted(() => ({ loadApiKey: vi.fn(), createModel: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { campaignMember: { findFirst: vi.fn() }, aiCredential: { findMany: vi.fn() } } }));
vi.mock("@/lib/ai/credentials", () => {
  class AiKeyUnreadableError extends Error {}

  return { AiKeyUnreadableError, loadApiKey: h.loadApiKey };
});

vi.mock("@/lib/ai/providers", () => ({ createModel: h.createModel }));

describe("pickDmSmartTextModel / pickDmTextModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue({ userId: "dm1" } as never);
    h.createModel.mockImplementation((provider: string, _k: string, id: string) => ({ provider, id }));
  });

  it("picks the smart model of the first keyed provider", async () => {
    h.loadApiKey.mockImplementation(async (_u: string, provider: string) => (provider === "google" ? "k" : null));

    expect(await pickDmSmartTextModel("c1")).toEqual({ model: { provider: "google", id: "gemini-3.5-flash" }, provider: "google", modelId: "gemini-3.5-flash" });
  });

  it("skips a provider with an unreadable key", async () => {
    const { AiKeyUnreadableError } = await import("@/lib/ai/credentials");

    h.loadApiKey.mockImplementation(async (_u: string, provider: string) => {
      if (provider === "anthropic") throw new AiKeyUnreadableError();

      return provider === "openai" ? "k" : null;
    });

    expect(await pickDmSmartTextModel("c1")).toMatchObject({ provider: "openai", modelId: "gpt-5.5" });
  });

  it("no DM or no keys -> null", async () => {
    h.loadApiKey.mockResolvedValue(null);
    expect(await pickDmSmartTextModel("c1")).toBeNull();

    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue(null);
    expect(await pickDmSmartTextModel("c1")).toBeNull();
  });

  it("pickDmTextModel still picks the fast model", async () => {
    h.loadApiKey.mockResolvedValue("k");

    expect(await pickDmTextModel("c1")).toEqual({ provider: "anthropic", id: "claude-haiku-4-5-20251001" });
  });
});

describe("readDmSmartAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue({ userId: "dm1" } as never);
  });

  it("true when a keyed provider has a smart model", async () => {
    vi.mocked(prisma.aiCredential.findMany).mockResolvedValue([{ provider: "openai" }] as never);

    expect(await readDmSmartAvailability("c1")).toBe(true);
  });

  it("false without keys or DM", async () => {
    vi.mocked(prisma.aiCredential.findMany).mockResolvedValue([] as never);
    expect(await readDmSmartAvailability("c1")).toBe(false);

    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue(null);
    expect(await readDmSmartAvailability("c1")).toBe(false);
  });
});

describe("pickDmImageModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue({ userId: "dm1" } as never);
  });

  it("no key -> null", async () => {
    h.loadApiKey.mockResolvedValue(null);

    expect(await pickDmImageModel("c1")).toBeNull();
  });

  it("no DM -> null", async () => {
    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue(null);

    expect(await pickDmImageModel("c1")).toBeNull();
  });

  it("returns the first model of the provider the DM has a key for", async () => {
    h.loadApiKey.mockImplementation(async (_u: string, provider: string) => (provider === "google" ? "k" : null));

    expect(await pickDmImageModel("c1")).toEqual({ userId: "dm1", provider: "google", model: "gemini-2.5-flash-image" });
  });
});

describe("readDmAiAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue({ userId: "dm1" } as never);
  });

  it("reads key presence without decrypting", async () => {
    vi.mocked(prisma.aiCredential.findMany).mockResolvedValue([{ provider: "anthropic" }] as never);

    expect(await readDmAiAvailability("c1")).toEqual({ text: true, image: false });
    expect(h.loadApiKey).not.toHaveBeenCalled();
  });

  it("image-capable provider enables images", async () => {
    vi.mocked(prisma.aiCredential.findMany).mockResolvedValue([{ provider: "google" }] as never);

    expect(await readDmAiAvailability("c1")).toEqual({ text: true, image: true });
  });

  it("no DM -> nothing available", async () => {
    vi.mocked(prisma.campaignMember.findFirst).mockResolvedValue(null);

    expect(await readDmAiAvailability("c1")).toEqual({ text: false, image: false });
  });
});
