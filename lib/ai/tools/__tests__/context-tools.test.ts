import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { loadRules } from "@/lib/server/campaigns/rules";
import { parseRules } from "@/lib/utils/rules/schema";
import { readCharacteristics } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findMany: vi.fn(), findFirst: vi.fn() },
    scenarioPage: { findFirst: vi.fn() },
    battleScene: { findFirst: vi.fn() },
    battleEvent: { findMany: vi.fn() },
    skill: { findMany: vi.fn(), findFirst: vi.fn() },
    artifact: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/server/campaigns/rules", () => ({ loadRules: vi.fn() }));
vi.mock("@/lib/server/show/show-store", () => ({ readShowState: vi.fn() }));
vi.mock("@/lib/utils/battle/store", () => ({ loadBattle: vi.fn() }));
vi.mock("@/lib/cache/reference-data", () => ({
  getCachedUnits: vi.fn(async () => [
    { id: "u1", name: "Фенікс", level: 7, abilitySummary: [{ when: [], if: [], then: [[{ key: "summary.effects.damageBonus", params: { filter: "x", value: "+10%" } }]], limits: [] }] },
    { id: "u2", name: "Грифон", level: 3, abilitySummary: [] },
  ]),
  getCachedSpells: vi.fn(async () => []),
  getCachedRaces: vi.fn(async () => []),
}));

const ctx = { campaignId: "camp1", userId: "dm", scopes: ["ai"] as const, threadId: null, locale: "uk" as const };

describe("context tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadRules).mockResolvedValue(parseRules({}));
  });

  it("get_party: лише герої гравців цієї кампанії", async () => {
    vi.mocked(prisma.character.findMany).mockResolvedValue([
      { id: "c1", name: "Годрик", level: 5, class: "Лицар", race: "Людина", armorClass: 16, notes: null },
    ] as never);

    const { getPartyTool } = await import("@/lib/ai/tools/party");

    expect(await getPartyTool.handler(ctx, {})).toEqual([expect.objectContaining({ id: "c1", name: "Годрик", level: 5 })]);
    expect(vi.mocked(prisma.character.findMany).mock.calls[0][0]).toMatchObject({ where: { campaignId: "camp1", type: "player" } });
  });

  it("get_show_state: без показу — повідомлення", async () => {
    const { readShowState } = await import("@/lib/server/show/show-store");

    vi.mocked(readShowState).mockResolvedValue(null);

    const { getShowStateTool } = await import("@/lib/ai/tools/show");

    expect(await getShowStateTool.handler(ctx, {})).toBe("No show is running right now");
  });

  it("get_battle_state: без активного бою — повідомлення", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue(null);

    const { getBattleStateTool } = await import("@/lib/ai/tools/battle");

    expect(await getBattleStateTool.handler(ctx, {})).toBe("No active battle");
  });

  it("get_battle_state: учасники з hp у форматі cur/max", async () => {
    const { loadBattle } = await import("@/lib/utils/battle/store");

    const part = (name: string, side: string, currentHp: number, maxHp: number) => ({
      basicInfo: { name, side },
      combatStats: { currentHp, maxHp, armorClass: 15, status: "active" },
    });

    vi.mocked(loadBattle).mockResolvedValue({
      isDM: true, isMember: true,
      meta: { name: "Засідка" },
      scene: { status: "active", round: 2, turnIndex: 1 },
      participants: [part("Годрик", "ally", 12, 20), part("Гоблін", "enemy", 3, 7)],
    } as never);
    vi.mocked(prisma.battleEvent.findMany).mockResolvedValue([{ round: 2, resultText: "Удар" }] as never);

    const { getBattleStateTool } = await import("@/lib/ai/tools/battle");

    expect(await getBattleStateTool.handler(ctx, { battleId: "b1" })).toMatchObject({
      name: "Засідка",
      round: 2,
      participants: [expect.objectContaining({ name: "Годрик", side: "ally", hp: "12/20", ac: 15 }), expect.objectContaining({ hp: "3/7" })],
      lastEvents: ["R2: Удар"],
    });
  });

  it("get_battle_state wfrp: wounds and characteristics, no hp/ac", async () => {
    const { loadBattle } = await import("@/lib/utils/battle/store");

    vi.mocked(loadBattle).mockResolvedValue({
      isDM: true, isMember: true,
      meta: { name: "Ambush", rules: WFRP_RULES },
      scene: { status: "active", round: 1, turnIndex: 0 },
      participants: [{ basicInfo: { name: "Hans", side: "ally" }, combatStats: { currentHp: 7, maxHp: 12, armorClass: 0, status: "active" }, abilities: { characteristics: readCharacteristics({ characteristics: { base: { ws: 35 } } }) } }],
    } as never);
    vi.mocked(prisma.battleEvent.findMany).mockResolvedValue([] as never);

    const { getBattleStateTool } = await import("@/lib/ai/tools/battle");

    const out = (await getBattleStateTool.handler(ctx, { battleId: "b1" })) as { participants: Record<string, unknown>[] };

    expect(out.participants[0]).toMatchObject({ name: "Hans", side: "ally", wounds: "7/12", status: "active", characteristics: expect.objectContaining({ ws: 35 }) });
    expect(out.participants[0]).not.toHaveProperty("ac");
    expect(out.participants[0]).not.toHaveProperty("hp");
  });

  it("get_battle_state rejects lost DM membership without exposing participants", async () => {
    const { loadBattle } = await import("@/lib/utils/battle/store");

    vi.mocked(loadBattle).mockResolvedValue({ isDM: false, isMember: true, meta: {}, scene: {}, participants: [] } as never);

    const { getBattleStateTool } = await import("@/lib/ai/tools/battle");

    await expect(getBattleStateTool.handler(ctx, { battleId: "b1" })).rejects.toMatchObject({ status: 403 });
  });
  it("search_reference: збіг за назвою без урахування регістру", async () => {
    const { searchReferenceTool } = await import("@/lib/ai/tools/reference");

    expect(await searchReferenceTool.handler(ctx, { kind: "unit", query: "фен" })).toEqual([{ id: "u1", name: "Фенікс" }]);
  });

  it("read_reference: підсумок здібностей юніта — текст, а не сегменти", async () => {
    const { readReferenceTool } = await import("@/lib/ai/tools/reference");

    const entry = (await readReferenceTool.handler(ctx, { kind: "unit", id: "u1" })) as { abilitySummary: unknown[] };

    expect(entry.abilitySummary).toEqual([expect.stringContaining("summary.effects.damageBonus")]);
  });

  it("read_reference wfrp: unit characteristics as a map of numbers", async () => {
    vi.mocked(loadRules).mockResolvedValue(parseRules(WFRP_RULES));

    const { getCachedUnits } = await import("@/lib/cache/reference-data");

    vi.mocked(getCachedUnits).mockResolvedValueOnce([{ id: "u9", name: "Beast", level: 1, abilitySummary: [], characteristics: readCharacteristics({ characteristics: { base: { ws: 35 } } }) }] as never);

    const { readReferenceTool } = await import("@/lib/ai/tools/reference");

    const entry = (await readReferenceTool.handler(ctx, { kind: "unit", id: "u9" })) as { characteristics: Record<string, number> };

    expect(entry.characteristics.ws).toBe(35);
  });

  it("read_reference artifact returns systemStats", async () => {
    vi.mocked(prisma.artifact.findFirst).mockResolvedValue({ id: "a1", name: "Blade", systemStats: { kind: "weapon" } } as never);

    const { readReferenceTool } = await import("@/lib/ai/tools/reference");

    expect(await readReferenceTool.handler(ctx, { kind: "artifact", id: "a1" })).toMatchObject({ systemStats: { kind: "weapon" } });
  });

  it("read_reference: чужий id — AiToolError", async () => {
    const { readReferenceTool } = await import("@/lib/ai/tools/reference");

    const { AiToolError } = await import("@/lib/ai/tools/define");

    await expect(readReferenceTool.handler(ctx, { kind: "unit", id: "nope" })).rejects.toBeInstanceOf(AiToolError);
  });

  it("read_reference: skill читається повним рядком у межах кампанії", async () => {
    vi.mocked(prisma.skill.findFirst).mockResolvedValue({ id: "s1", name: "Удар", abilities: [] } as never);

    const { readReferenceTool } = await import("@/lib/ai/tools/reference");

    expect(await readReferenceTool.handler(ctx, { kind: "skill", id: "s1" })).toMatchObject({ abilities: [] });
    expect(vi.mocked(prisma.skill.findFirst).mock.calls[0][0]).toEqual({ where: { id: "s1", campaignId: "camp1" } });
  });
});
