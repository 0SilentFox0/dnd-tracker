import { beforeEach, describe, expect, it, vi } from "vitest";

import { pickDmImageModel, readDmAiAvailability } from "../dm-model";

import { prisma } from "@/lib/db";

const h = vi.hoisted(() => ({ loadApiKey: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { campaignMember: { findFirst: vi.fn() }, aiCredential: { findMany: vi.fn() } } }));
vi.mock("@/lib/ai/credentials", () => {
  class AiKeyUnreadableError extends Error {}

  return { AiKeyUnreadableError, loadApiKey: h.loadApiKey };
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
