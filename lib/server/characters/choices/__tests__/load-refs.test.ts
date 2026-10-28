import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  race: vi.fn(),
  feats: vi.fn(async () => []),
}));

vi.mock("@/lib/db", () => ({ prisma: { race: { findFirst: mocks.race }, spell: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedClasses: vi.fn(async () => []), getCachedFeats: mocks.feats }));

import { loadChoiceRefs } from "../load-refs";

describe("loadChoiceRefs feats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("outside class mode feats load only for a race with a feat choice (Human Versatile)", async () => {
    mocks.race.mockResolvedValue({ id: "r", name: "Human", choices: [{ id: "versatile", label: "Versatile", level: 1, count: 1, kind: "feat", featTypes: ["origin"] }] });

    await loadChoiceRefs("c1", "Human", { classMode: false });

    expect(mocks.feats).toHaveBeenCalled();
  });

  it("a race without feat choices does not touch feats", async () => {
    mocks.race.mockResolvedValue({ id: "r", name: "Elf", choices: [] });

    await loadChoiceRefs("c1", "Elf", { classMode: false });

    expect(mocks.feats).not.toHaveBeenCalled();
  });
});
