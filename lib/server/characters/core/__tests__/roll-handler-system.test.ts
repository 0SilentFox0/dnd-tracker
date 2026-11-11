import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { CharacterLogKind } from "@/lib/constants/character-log";
import { makeT } from "@/lib/i18n/test/mock-t";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { applyWfrpConditionTo } from "@/systems/wfrp/rules/conditions/apply";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

vi.mock("server-only", () => ({}));

const writeCharacterLog = vi.fn();

const tx = { character: { updateMany: vi.fn() } };

vi.mock("@/lib/db", () => ({ prisma: { $transaction: (fn: (t: unknown) => unknown) => fn(tx) } }));
vi.mock("@/lib/i18n/request-locale", () => ({ getRequestLocale: async () => "en" }));
vi.mock("@/lib/i18n/translator", () => ({ getTranslator: async () => makeT() }));

const loadBattleEffects = vi.fn();

vi.mock("@/lib/server/characters/battle-effects", () => ({ loadBattleEffects: (...a: unknown[]) => loadBattleEffects(...a) }));
vi.mock("@/lib/server/characters/battle-lock", () => ({ assertNotInActiveBattle: vi.fn() }));
vi.mock("@/lib/server/characters/log", () => ({ writeCharacterLog: (...a: unknown[]) => writeCharacterLog(...a) }));
vi.mock("@/lib/server/characters/participant", () => ({ buildCharacterParticipant: async () => ({ participant: createMockParticipant() }) }));

const { rollForSheet } = await import("../roll-handler");

const gate = (rules: unknown, characteristics: unknown = { base: { ws: 45 } }) =>
  ({ access: { userId: "u", campaign: { rules, maxLevel: 20 } }, character: { id: "c", campaignId: "camp", characteristics } }) as never;

const rejects = async (promise: Promise<unknown>, status: number, message: string) => {
  await expect(promise).rejects.toMatchObject({ status, message });
};

describe("rollForSheet by rule system", () => {
  beforeEach(() => vi.clearAllMocks());

  it("d20 campaign rejects a test roll without logging", async () => {
    await rejects(rollForSheet(gate(DEFAULT_RULES), { kind: "test", characteristic: "ws", difficulty: "challenging" }), 400, API_ERRORS.ROLL_KIND_MISMATCH);
    expect(writeCharacterLog).not.toHaveBeenCalled();
  });

  it("wfrp campaign rejects a check roll", async () => {
    await rejects(rollForSheet(gate(WFRP_RULES), { kind: "check", ability: "strength" }), 400, API_ERRORS.ROLL_KIND_MISMATCH);
    expect(writeCharacterLog).not.toHaveBeenCalled();
  });

  it("wfrp test logs TEST with target, sl and outcome", async () => {
    const result = await rollForSheet(gate(WFRP_RULES), { kind: "test", characteristic: "ws", difficulty: "challenging" });

    expect(result).toMatchObject({ kind: "percentile", target: 45 });

    const [, [entry]] = writeCharacterLog.mock.calls[0];

    expect(entry.kind).toBe(CharacterLogKind.TEST);
    expect(entry.data).toMatchObject({ target: 45, sl: result.kind === "percentile" ? result.sl : 0, outcome: expect.any(String), difficulty: "challenging" });
  });

  it("d20 check returns kind d20 and logs CHECK", async () => {
    const result = await rollForSheet(gate(DEFAULT_RULES), { kind: "check", ability: "strength" });

    expect(result.kind).toBe("d20");
    expect(writeCharacterLog.mock.calls[0][1][0].kind).toBe(CharacterLogKind.CHECK);
  });

  describe("battle effects", () => {
    const targetOf = async (rules: unknown) => {
      const result = await rollForSheet(gate(rules), { kind: "test", characteristic: "ws", difficulty: "challenging" });

      return result.kind === "percentile" ? result.target : -1;
    };

    const fatigued = (levels: number) => {
      const p = createMockParticipant();

      return applyWfrpConditionTo(p, { key: "fatigued", levels, round: 1, sourceName: "x" }).participant.battleData.activeEffects;
    };

    it("wfrp in battle: effects lower the target", async () => {
      loadBattleEffects.mockResolvedValue(null);

      const base = await targetOf(WFRP_RULES);

      loadBattleEffects.mockResolvedValue(fatigued(2));

      expect(await targetOf(WFRP_RULES)).toBe(base - 20);
    });

    it("wfrp out of battle: unchanged", async () => {
      loadBattleEffects.mockResolvedValue(null);

      expect(await targetOf(WFRP_RULES)).toBe(45);
    });

    it("dnd5e never looks up battle effects", async () => {
      await rollForSheet(gate(DEFAULT_RULES), { kind: "check", ability: "strength" });

      expect(loadBattleEffects).not.toHaveBeenCalled();
    });
  });
});
