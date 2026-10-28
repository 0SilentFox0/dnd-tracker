import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { executorDatabase } from "./fixtures/executor-db";

import { HANDOFF_ACTION_COVERAGE } from "@/lib/server/assistant/actions/handoff-coverage";
import { buildAssistantHandoff, HANDOFF_ACTIONS, readCompendiumSummary } from "@/lib/server/assistant/actions/handoffs";
import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { ASSISTANT_ROUTE_COVERAGE, exportedHttpMethods } from "@/lib/server/assistant/coverage";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { AssistantCaller } from "@/lib/server/assistant/types";
import { prismaImportRepository } from "@/lib/server/compendium-import/repository";
import { confirmImport, type ImportInput } from "@/lib/server/compendium-import/service";

const f = vi.hoisted(() => ({ allowed: true, member: true, entryQueries: [] as Record<string, unknown>[], reports: [] as Record<string, unknown>[], entries: [] as Record<string, unknown>[] }));

vi.mock("@/lib/db", () => ({ prisma: {
  campaignMember: { findMany: async () => f.member ? [{ role: "dm" }] : [] },
  campaign: { findFirst: async () => f.allowed ? { id: "campaign" } : null, findMany: async () => [] },
  compendiumEntry: { findMany: async (query: Record<string, unknown>) => { f.entryQueries.push(query);

 return f.entries; } },
  compendiumImportRun: { findMany: async () => f.reports },
} }));

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", threadId: null, tokenId: null };

const token: AssistantCaller = { actor: { ...caller.actor, via: "token", scopes: ["content:write"] }, channel: "mcp", threadId: null, tokenId: "token" };

beforeEach(() => { f.allowed = true; f.member = true; f.entryQueries = []; f.reports = []; f.entries = []; });

describe("T13 protected handoffs", () => {
  it("compendiumConfirmStillRequiresSessionPreviewRights", async () => {
    const a = HANDOFF_ACTIONS.find(a => a.id === "handoff.compendium-confirm");

    expect(a?.effect).toBe("handoff");
    await expect(confirmImport(token.actor, {} as ImportInput, "not-a-preview", "key", "x".repeat(32), prismaImportRepository)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(readCompendiumSummary(token.actor, "reports", {})).rejects.toMatchObject({ status: 403 });
    expect(f.entryQueries).toHaveLength(0);
  });
  it("tokenAndInviteSecretNeverInOutputs", () => {
    const output = ["credentials", "tokens", "invite"].map(k => buildAssistantHandoff(caller.actor, k));

    expect(output.map(x => x.href)).toEqual(["/settings/ai", "/campaigns/campaign/dm/ai", "/campaigns/campaign#invite"]);
    for (const k of ["credentials", "tokens", "invite"]) expect(() => buildAssistantHandoff(caller.actor, k, { token: "SECRET", inviteCode: "SECRET" })).toThrow();
    expect(JSON.stringify(output)).not.toContain("SECRET");
  });
  it("signedUploadTicketNeverEntersHistory", async () => {
    const { db, state } = executorDatabase();

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(HANDOFF_ACTIONS) });

    const output = await executor.dispatchAction(caller, { actionId: "handoff.slide-upload", input: { deckId: "deck" }, requestId: "upload" });

    expect(output).toMatchObject({ kind: "handoff", href: "/campaigns/campaign/dm/show/deck" });
    expect(JSON.stringify(output)).not.toMatch(/token|signed|publicUrl|SECRET/i);
    expect(state.receipts.size).toBe(0); expect(state.intents.size).toBe(0);
  });
  it("externalHrefAndPayloadRejected", () => {
    for (const target of [{ href: "https://evil.test" }, { raw: { spell: [] } }, { deckId: "//evil.test" }, { deckId: "deck?token=SECRET" }]) expect(() => buildAssistantHandoff(caller.actor, "slide-upload", target)).toThrow();
    expect(() => buildAssistantHandoff(caller.actor, "https://evil.test")).toThrow();
    expect(() => buildAssistantHandoff({ ...caller.actor, campaignId: "../escape" }, "invite")).toThrow();
  });
  it("sourceNotesRequireExplicitSelection", async () => {
    f.entries = [{ canonicalKey: "selected", originalName: "Chosen", edition: "one", notes: "Selected text https://storage.test/x?token=SECRET", sourceJson: "RAW_SECRET", attribution: { token: "SECRET" } }];
    await expect(readCompendiumSummary(caller.actor, "notes", {})).rejects.toMatchObject({ status: 400 });
    expect(f.entryQueries).toEqual([]);

    const result = await readCompendiumSummary(caller.actor, "notes", { selectedKeys: ["selected"] });

    expect(result).toMatchObject({ data: { entries: [{ canonicalKey: "selected", notes: expect.stringContaining("Selected text") }] } });
    expect(f.entryQueries[0]).toMatchObject({ where: { campaignId: "campaign", canonicalKey: { in: ["selected"] } }, take: 5 });
    expect(JSON.stringify(result)).not.toMatch(/SECRET|RAW_SECRET|attribution|sourceJson/);
  });
  it("draftAiRemainsSeparate", () => {
    const draft = HANDOFF_ACTIONS.find(a => a.id === "handoff.player-draft");

    expect(draft?.effect).toBe("handoff");
    expect(buildAssistantHandoff(caller.actor, "player-draft")).toMatchObject({ href: "/campaigns/campaign/character/draft", reason: expect.stringContaining("гравця") });
    expect(HANDOFF_ACTIONS.some(a => a.effect === "write" || a.effect === "paid")).toBe(false);
  });
  it("session-only report token returns handoff without manufacturing a session actor", async () => {
    const { db } = executorDatabase();

    db.apiToken.findUnique = (async () => ({ id: "token", userId: "dm", campaignId: "campaign", scopes: ["content:write"], revokedAt: null })) as never;

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog(HANDOFF_ACTIONS) });

    expect(await executor.dispatchAction(token, { actionId: "compendium.reports", input: {}, requestId: "reports" })).toMatchObject({ kind: "handoff", href: "/campaigns/campaign/dm/compendium" });
    expect(f.entryQueries).toEqual([]);
    expect(token.actor.via).toBe("token");
  });
  it("bounded report projections omit original sources, raw JSON and arbitrary fields", async () => {
    f.reports = Array.from({ length: 21 }, (_, n) => ({ id: `r${n}`, createdAt: new Date(0), report: { counts: { created: 2, updated: 1, unchanged: 4, errors: 0 }, readyToPlay: false, readyToImport: true, sources: [{ token: "SECRET" }], rows: [{ raw: "SECRET" }], raw: "SECRET" } }));

    const r = await readCompendiumSummary(caller.actor, "reports", {});

    expect(r).toMatchObject({ data: { hasMore: true, runs: expect.arrayContaining([{ id: "r0", createdAt: new Date(0).toISOString(), counts: { created: 2, updated: 1, unchanged: 4, errors: 0 }, readyToPlay: false, readyToImport: true }]) } });
    expect((r.data as { runs: unknown[] }).runs).toHaveLength(20);
    expect(JSON.stringify(r)).not.toContain("SECRET");
  });
  it("live rights, selected foreign keys and excessive selections fail closed", async () => {
    f.allowed = false;
    await expect(readCompendiumSummary(caller.actor, "reports", {})).rejects.toThrow();
    f.allowed = true;
    await expect(readCompendiumSummary(caller.actor, "notes", { selectedKeys: ["foreign"] })).rejects.toMatchObject({ status: 404 });
    await expect(readCompendiumSummary(caller.actor, "notes", { selectedKeys: Array(6).fill("x") })).rejects.toMatchObject({ status: 400 });
  });
  it("removing DM membership blocks even the historical campaign owner", async () => {
    f.allowed = true; f.member = false;
    await expect(readCompendiumSummary(caller.actor, "reports", {})).rejects.toMatchObject({ status: 403 });
  });
  it("model source-notes handoff cannot forge a human selection", () => {
    const action = HANDOFF_ACTIONS.find(a => a.id === "handoff.source-notes");

    expect(action?.effect).toBe("handoff");
    expect(action?.input.safeParse({ selectedKeys: ["secret"] }).success).toBe(false);
  });
  it("all UI ledger methods have a safe destination or authorized read owner", () => {
    const expected = ASSISTANT_ROUTE_COVERAGE.filter(r => r.task === 13 || r.adapter === "handoffs/settings").flatMap(r => r.methods.map(m => `${m} ${r.route}`)).sort();

    expect(HANDOFF_ACTION_COVERAGE.map(r => `${r.method} ${r.route}`).sort()).toEqual(expected);
    for (const row of HANDOFF_ACTION_COVERAGE) {
      expect(exportedHttpMethods(readFileSync(`app/api/${row.route}/route.ts`, "utf8"))).toContain(row.method);
      expect(HANDOFF_ACTIONS.find(a => a.id === row.actionId), row.actionId).toBeDefined();
    }
  });
});

it("T18 source-note options expose bounded session metadata and no note content",async()=>{
 f.entries=Array.from({length:21},(_,i)=>({canonicalKey:`own-${i}`,originalName:`Назва ${i}`,notes:'PRIVATE NOTE',sourceJson:'RAW SECRET'}));

 const result=await readCompendiumSummary(caller.actor,'note-options',{offset:0,limit:20});

 expect(result.data).toMatchObject({nextOffset:20});expect((result.data as {items:unknown[]}).items).toHaveLength(20);
 expect(f.entryQueries[0]).toMatchObject({where:{campaignId:'campaign'},select:{canonicalKey:true,originalName:true},take:21});
 expect(JSON.stringify(result)).not.toMatch(/PRIVATE NOTE|RAW SECRET|sourceJson/);
 expect(HANDOFF_ACTIONS.some(a=>a.id==='compendium.note-options')).toBe(false);
});
