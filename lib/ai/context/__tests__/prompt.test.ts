import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";

const caller = { actor: { campaignId: "camp1", userId: "dm", isDM: true, via: "session" as const, scopes: null }, channel: "chat" as const, tokenId: null, threadId: null, locale: "uk" as const };

vi.mock("@/lib/server/assistant/catalog", () => ({ assistantCatalog: { listActions: () => [{ id: "campaign.read" }] } }));
vi.mock("@/lib/server/assistant/authorize", () => ({ revalidateAssistantCaller: vi.fn(async (c) => c.actor) }));
vi.mock("@/lib/server/assistant/actions/compendium-reads", () => ({ readCompendiumSummary: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: vi.fn() }, scenarioPage: { findFirst: vi.fn() } } }));
vi.mock("@/lib/ai/tools/party", () => ({ partySummary: vi.fn(async () => [{ id: "c1", name: "Годрик", level: 5, class: "Лицар", race: "Людина", armorClass: 16, notes: "боїться вогню" }]) }));
vi.mock("@/lib/ai/tools/show", () => ({ showSummary: vi.fn(async () => "Слайд: Собор") }));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const section = (id: string, played: boolean, text: string) => ({ id, title: `Розділ ${id}`, played, rows: [{ id: `r-${id}`, story: doc(text), notes: doc(`нотатка ${id}`) }] });

describe("buildInstructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ name: "Асхан", description: "Темне фентезі" } as never);
    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "Монастир", kind: "scene", content: { legend: [], sections: [section("s1", true, "зіграний текст"), section("s2", false, "поточний текст"), section("s3", false, "майбутній текст")] } } as never);
  });

  it("live: роль, стислість, партія, показ, поточний розділ повністю, зіграні — лише назвами", async () => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ caller, campaignId: "camp1", mode: "live", pageId: "p1" });

    expect(out).toContain("Асхан");
    expect(out).toContain("Reply in Ukrainian.");
    expect(out).toMatch(/1–5 sentences/);
    expect(out).toContain("Годрик");
    expect(out).toContain("Слайд: Собор");
    expect(out).toContain("поточний текст");
    expect(out).toContain("Розділ s1");
    expect(out).not.toContain("зіграний текст");
  });

  it.each([["uk", "Reply in Ukrainian."], ["en", "Reply in English."]] as const)("reply language follows the caller locale (%s)", async (locale, expected) => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ caller: { ...caller, locale }, campaignId: "camp1", mode: "live", pageId: null });

    expect(out).toContain(expected);
  });

  it("scenario: вся сторінка + focus", async () => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ caller, campaignId: "camp1", mode: "scenario", pageId: "p1", focus: { pageId: "p1", sectionId: "s3", rowIds: ["r-s3"] } });

    expect(out).toContain("зіграний текст");
    expect(out).toContain("майбутній текст");
    expect(out).toContain("propose_scenario_edit");
    expect(out).toMatch(/DM focus:[\s\S]*s3/);
  });

  it("бюджет: довга сторінка обрізається до contextChars", async () => {
    const { AI_LIMITS } = await import("@/lib/constants/ai");

    vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: Array.from({ length: 80 }, (_, i) => section(`x${i}`, false, "слово ".repeat(200))) } } as never);

    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ caller, campaignId: "camp1", mode: "scenario", pageId: "p1" });

    expect(out.length).toBeLessThanOrEqual(AI_LIMITS.contextChars);
    expect(out).toContain("[truncated]");
  });

  it("без сторінки — тільки роль, режим, партія", async () => {
    const { buildInstructions } = await import("@/lib/ai/context/prompt");

    const out = await buildInstructions({ caller, campaignId: "camp1", mode: "live", pageId: null });

    expect(out).toContain("Годрик");
    expect(prisma.scenarioPage.findFirst).not.toHaveBeenCalled();
  });

  describe("постійні інструкції", () => {
    const withInstructions = (text: string | null) => vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ name: "Асхан", description: "Темне фентезі", aiInstructions: text } as never);

    it.each(["live", "scenario"] as const)("%s: блок стоїть перед правилами режиму", async (mode) => {
      withInstructions("Говори архаїчно");

      const { buildInstructions } = await import("@/lib/ai/context/prompt");

      const out = await buildInstructions({ caller, campaignId: "camp1", mode, pageId: null });

      expect(out).toContain("Standing DM instructions for this campaign");
      expect(out.indexOf("Говори архаїчно")).toBeGreaterThan(out.indexOf("Reply in Ukrainian."));
      expect(out.indexOf("Говори архаїчно")).toBeLessThan(out.indexOf("Mode:"));
    });

    it("не обрізаються разом зі сценою", async () => {
      const text = "правило ".repeat(900).trim();

      withInstructions(text);
      vi.mocked(prisma.scenarioPage.findFirst).mockResolvedValue({ id: "p1", title: "М", kind: "scene", content: { legend: [], sections: Array.from({ length: 80 }, (_, i) => section(`x${i}`, false, "слово ".repeat(200))) } } as never);

      const { buildInstructions } = await import("@/lib/ai/context/prompt");

      const out = await buildInstructions({ caller, campaignId: "camp1", mode: "scenario", pageId: "p1" });

      expect(out).toContain(text);
      expect(out).toContain("[truncated]");
    });

    it.each([null, "   "])("порожні (%j) — блоку немає", async (value) => {
      withInstructions(value);

      const { buildInstructions } = await import("@/lib/ai/context/prompt");

      expect(await buildInstructions({ caller, campaignId: "camp1", mode: "live", pageId: null })).not.toContain("Постійні інструкції");
    });
  });
});
