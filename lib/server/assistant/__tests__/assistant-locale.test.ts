import { beforeEach, describe, expect, it, vi } from "vitest";

import { CAMPAIGN_ACTIONS } from "@/lib/server/assistant/actions/campaign";
import { buildAssistantHandoff } from "@/lib/server/assistant/actions/handoffs";
import type { AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";
import { runCampaignOperation } from "@/lib/server/campaigns/action-service";
import { resolveAiOps } from "@/lib/utils/scenario/ai-ops";

vi.unmock("@/lib/i18n/translator");

const h = vi.hoisted(() => ({
  campaign: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  campaignMember: { findUnique: vi.fn(), findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  apiToken: { update: vi.fn(), create: vi.fn() },
  aiThread: { update: vi.fn() },
  $queryRaw: vi.fn(async () => [{ id: "c" }]),
}));

vi.mock("@/lib/db", () => ({ prisma: { ...h, $transaction: (fn: (db: typeof h) => unknown) => fn(h) } }));
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn(), ReferenceKind: { RACES: "races" } }));

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const callerOf = (locale: "uk" | "en"): AssistantCaller => ({ actor, channel: "chat", threadId: null, tokenId: null, locale });

const row = { id: "c", name: "Camp", description: null, kind: "campaign", visibility: "private", maxLevel: 10, allowPlayerEdit: false, status: "active", aiInstructions: null, inviteCode: "X", updatedAt: new Date(0), createdAt: new Date(0) };

describe("assistant results follow the caller's locale", () => {
  beforeEach(() => { vi.clearAllMocks(); h.campaign.findUnique.mockResolvedValue(row); });

  it.each([
    ["en", "Campaign: delete", "The campaign and all dependent records will be deleted."],
    ["uk", "Кампанія: delete", "Кампанія та всі залежні записи будуть видалені."],
  ] as const)("campaign.delete preview in %s", async (locale, summary, warning) => {
    const action = CAMPAIGN_ACTIONS.find((a) => a.id === "campaign.delete") as AssistantWriteAction;

    const preview = await action.prepare(callerOf(locale), {});

    expect(preview.summary).toBe(summary);
    expect(preview.warnings).toEqual([warning]);
  });

  it.each([["en", "Campaign"], ["uk", "Кампанія"]] as const)("result label in %s", async (locale, name) => {
    const result = await runCampaignOperation(actor, "status", {}, undefined, locale);

    expect(result.affected[0].name).toBe(name);
  });

  it.each([
    ["en", "Add or change the provider key in the AI settings."],
    ["uk", "Додайте або змініть ключ провайдера у налаштуваннях AI."],
  ] as const)("handoff reason in %s", async (locale, reason) => {
    expect(await buildAssistantHandoff(actor, "credentials", {}, locale)).toEqual({ href: "/settings/ai", reason });
  });

  it.each([
    ["en", "Section nope is not on the page"],
    ["uk", "Розділу nope немає на сторінці"],
  ] as const)("scenario op error is a text ref that translates in %s", async (locale, text) => {
    const { getTranslator } = await import("@/lib/i18n/translator");

    const t = await getTranslator(locale, "assistant");

    const result = resolveAiOps({ legend: [], sections: [] }, [{ op: "renameSection", sectionId: "nope", title: "x" }], t);

    if (result.ok) throw new Error("expected a failure");

    const { message, params } = result.error;

    expect((await getTranslator(locale))(message, params)).toBe(text);
  });
});
