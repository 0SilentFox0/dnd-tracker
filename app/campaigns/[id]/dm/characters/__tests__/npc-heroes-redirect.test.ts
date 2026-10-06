import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

import DMNPCHeroesPage from "@/app/campaigns/[id]/dm/npc-heroes/page";

describe("dm/npc-heroes", () => {
  it("редирект на вкладку NPC-героїв", async () => {
    await DMNPCHeroesPage({ params: Promise.resolve({ id: "c1" }) });

    expect(redirect).toHaveBeenCalledWith("/campaigns/c1/dm/characters?type=npc_hero");
  });
});
