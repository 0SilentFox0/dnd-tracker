import { describe, expect, it, vi } from "vitest";

import { BATTLE_ACTIONS } from "@/lib/server/assistant/actions/battles";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { readBattleAction } from "@/lib/server/battles/action-service";

vi.unmock("@/lib/i18n/translator");

const h = vi.hoisted(() => ({ findMany: vi.fn(async () => [{ id: "b1", name: "Fight", status: "active", version: 1 }]) }));

vi.mock("@/lib/db", () => ({ prisma: { battleScene: { findMany: h.findMany } } }));
vi.mock("@/lib/server/battles/guards", () => ({ requireDmMember: vi.fn(async () => undefined), assertWriteScope: vi.fn() }));

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const callerOf = (locale: "uk" | "en"): AssistantCaller => ({ actor, channel: "chat", threadId: null, tokenId: null, locale });

describe("battle assistant actions follow the caller's locale", () => {
  it.each([
    ["en", "The DM picks the crit effect"],
    ["uk", "ДМ обирає ефект крита"],
  ] as const)("crit-choice handoff reason in %s", async (locale, start) => {
    const action = BATTLE_ACTIONS.find((a) => a.id === "battles.crit-choice");

    const handoff = await (action as { execute: (c: AssistantCaller, raw: unknown) => Promise<{ reason: string }> }).execute(callerOf(locale), { battleId: "b1" });

    expect(handoff.reason.startsWith(start)).toBe(true);
  });

  it("tool descriptions for the model stay English", () => {
    for (const action of BATTLE_ACTIONS) expect(`${action.title}${action.description}`).not.toMatch(/\p{Script=Cyrillic}/u);
  });

  it.each([["en", "Battle"], ["uk", "Бій"]] as const)("result label in %s", async (locale, name) => {
    const result = await readBattleAction(actor, "list", {}, locale);

    expect(result.affected[0].name).toBe(name);
  });
});
