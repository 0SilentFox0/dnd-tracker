import { describe, expect, it, vi } from "vitest";

import { createAcquaintance, findAcquaintancesByNames } from "@/lib/server/acquaintances/service";

vi.mock("server-only", () => ({}));

const tx = () => ({ acquaintance: { create: vi.fn().mockResolvedValue({ id: "a1" }), findMany: vi.fn().mockResolvedValue([]) } });

describe("acquaintance service", () => {
  it("createAcquaintance drops characterId for micro and defaults avatar", async () => {
    const t = tx();

    await createAcquaintance(t as never, "c1", { kind: "micro", characterId: "ch", name: "B", description: "", sourcePageId: "p", sourceSectionId: "s" });

    expect(t.acquaintance.create.mock.calls[0][0].data).toMatchObject({ campaignId: "c1", kind: "micro", characterId: null, avatarUrl: null });
  });

  it("findAcquaintancesByNames matches case-insensitively in the campaign", async () => {
    const t = tx();

    await findAcquaintancesByNames(t as never, "c1", [" Beatrice "]);

    expect(t.acquaintance.findMany.mock.calls[0][0].where).toEqual({ campaignId: "c1", OR: [{ name: { equals: "Beatrice", mode: "insensitive" } }] });
  });
});
