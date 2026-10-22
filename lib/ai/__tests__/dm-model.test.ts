import { beforeEach, describe, expect, it, vi } from "vitest";

import { pickDmImageModel } from "../dm-model";

import { prisma } from "@/lib/db";

const h = vi.hoisted(() => ({ loadApiKey: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { campaignMember: { findFirst: vi.fn() } } }));
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
