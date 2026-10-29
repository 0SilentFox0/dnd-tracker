import { expect, it } from "vitest";

import { assistantCatalog } from "../catalog";
import { createAssistantExecutor } from "../execute";
import type { AssistantCaller } from "../types";
import { executorDatabase } from "./fixtures/executor-db";

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", via: "session", isDM: true, scopes: null }, tokenId: null, threadId: "thread", channel: "chat", locale: "uk" as const };

it("default catalog includes every completed domain with no confirm/apply/policy action", () => {
  for (const id of ["content.units.get", "campaign.status", "scenario.get", "scenario.propose-edit", "scenario.legacy-proposal", "characters.get", "characters.choices", "battles.attack", "show.generate", "show.get", "compendium.entries", "handoff.source-notes"]) expect(assistantCatalog.getAction(id)).toBeDefined();

  const ids = assistantCatalog.listActions(caller.actor).map(a => a.id);

  expect(ids.some(id => /assistant\.(confirm|apply|set-auto|policy)/.test(id))).toBe(false);
});
it("paid action fails closed without transport run identity, even with explicit consent", async () => {
  const { db, state } = executorDatabase();

  const engine = createAssistantExecutor({ db });

  await expect(engine.dispatchAction(caller, { actionId: "show.generate", requestId: "paid", input: { explicitRequest: true, body: { prompt: "Forest", provider: "openai", model: "gpt-image-2", aspect: "16:9", useCampaignStyle: true } } })).rejects.toMatchObject({ status: 409 });
  expect(state.intents.size).toBe(0); expect(state.receipts.size).toBe(0);
});
it("discovery never upgrades an ai-only or read-only token to write grants", () => {
  expect(assistantCatalog.listActions({ ...caller.actor, via: "token", scopes: ["ai"] })).toHaveLength(0);

  const ids = assistantCatalog.listActions({ ...caller.actor, via: "token", scopes: ["show:read"] }).map(a => a.id);

  expect(ids).toContain("show.get"); expect(ids).not.toContain("show.generate"); expect(ids).not.toContain("battles.attack");
});
