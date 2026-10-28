import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { character: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null) } } }));

import { partySummary } from "@/lib/ai/tools/party";

describe("partySummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("лише активні гравці — чернетки не потрапляють в AI-контекст", async () => {
    await partySummary("camp");

    expect(prisma.character.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { campaignId: "camp", type: "player", status: "active" } }));
  });
});
