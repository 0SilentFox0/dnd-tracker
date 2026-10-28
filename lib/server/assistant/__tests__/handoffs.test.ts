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
  it.each([
    ["credentials", {}, "/settings/ai", "Додайте або змініть ключ провайдера у налаштуваннях AI."],
    ["tokens", {}, "/campaigns/campaign/dm/ai", "Керуйте API-токенами та їхніми правами у застосунку."],
    ["invite", {}, "/campaigns/campaign#invite", "Перегляньте запрошення у кампанії та передайте його людині самостійно."],
    ["campaign-import", {}, "/campaigns/new", "Виберіть локальний файл у формі створення кампанії."],
    ["campaign-join", {}, "/campaigns", "Введіть код запрошення у діалозі входу в кампанію."],
    ["content-import", { kind: "spells" }, "/campaigns/campaign/dm/spells", "Виберіть файл, перевірте мапінг і підтвердіть імпорт у чинному редакторі."],
    ["ai-map", { kind: "tracks" }, "/campaigns/campaign/dm/music", "Оберіть дані та запустіть AI-мапінг у діалозі імпорту."],
    ["slide-upload", {}, "/campaigns/campaign/dm/show", "Виберіть зображення у редакторі набору слайдів."],
    ["slide-upload", { deckId: "foreign-deck" }, "/campaigns/campaign/dm/show/foreign-deck", "Виберіть зображення у редакторі набору слайдів."],
    ["track-upload", {}, "/campaigns/campaign/dm/music", "Виберіть аудіофайл у бібліотеці музики."],
    ["player-draft", {}, "/campaigns/campaign/character/draft", "Чернетка та AI-функції гравця доступні лише у власному флоу гравця."],
    ["compendium-read", {}, "/campaigns/campaign/dm/compendium", "Перегляньте дозволені звіти та варіанти імпорту через власну сесію у застосунку."],
    ["compendium-preview", {}, "/campaigns/campaign/dm/compendium", "Виберіть локальний JSON, перевірте preview і підтвердіть права на матеріали у застосунку."],
    ["compendium-confirm", {}, "/campaigns/campaign/dm/compendium", "Відкрийте чинний preview, перевірте вибір і підтвердіть права на імпорт у застосунку."],
    ["source-notes", {}, "/campaigns/campaign/dm/compendium", "ДМ має явно вибрати примітки джерела перед передачею AI. Автоматично примітки не передаються."],
  ])("preserves %s navigation and its review reason", (kind, target, href, reason) => {
    expect(buildAssistantHandoff(caller.actor, kind as string, target)).toEqual({ href, reason });
  });
  it.each(["%2fescape", "deck%3fsecret", "deck/confirm", "../foreign", "https://evil.test"])("rejects encoded or unsafe deck and campaign identifiers: %s", id => {
    expect(() => buildAssistantHandoff(caller.actor, "slide-upload", { deckId: id })).toThrow();
    expect(() => buildAssistantHandoff({ ...caller.actor, campaignId: id }, "invite")).toThrow();
  });
  it("rejects unknown kinds and non-DM actors with existing statuses", () => {
    expect(() => buildAssistantHandoff(caller.actor, "unknown")).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => buildAssistantHandoff({ ...caller.actor, isDM: false }, "invite")).toThrow(expect.objectContaining({ status: 403 }));
  });
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
  it.each([[], ["one", "one"], Array.from({ length: 6 }, (_, i) => `key-${i}`)].map(selectedKeys => ({ selectedKeys })))("rejects invalid note selections before a read: $selectedKeys", async ({ selectedKeys }) => {
    await expect(readCompendiumSummary(caller.actor, "notes", { selectedKeys })).rejects.toMatchObject({ status: 400 });
    expect(f.entryQueries).toEqual([]);
  });
  it("returns at most five selected notes, masks credentials and bounds text fields", async () => {
    const selectedKeys = ["one", "two", "three", "four", "five"];

    f.entries = selectedKeys.map(canonicalKey => ({ canonicalKey, originalName: "n".repeat(250), edition: "e".repeat(25), notes: "HTTPS://storage.test/x?token=SECRET Bearer PRIVATE_TOKEN sk-abcdefghijkl " + "x".repeat(4000) }));

    const result = await readCompendiumSummary(caller.actor, "notes", { selectedKeys });

    const entries = (result.data as { entries: { originalName: string; edition: string; notes: string }[] }).entries;

    expect(entries).toHaveLength(5);
    for (const entry of entries) {
      expect(entry.originalName).toHaveLength(200);
      expect(entry.edition).toHaveLength(20);
      expect(entry.notes).toHaveLength(3000);
      expect(entry.notes).toContain("[Приховано]");
    }
    expect(JSON.stringify(result)).not.toMatch(/SECRET|PRIVATE_TOKEN|sk-abcdefghijkl/);
  });
  it("keeps structured notes in the application instead of returning raw JSON", async () => {
    f.entries = [{ canonicalKey: "one", originalName: "Name", edition: "one", notes: '  {"private":"RAW_SECRET"}' }];
    expect(await readCompendiumSummary(caller.actor, "notes", { selectedKeys: ["one"] })).toMatchObject({ data: { entries: [{ notes: "Структуровані примітки перегляньте у застосунку." }] } });
  });
  it.each([-1, 100001])("rejects out-of-bounds pagination offset %s", async offset => {
    await expect(readCompendiumSummary(caller.actor, "note-options", { offset })).rejects.toMatchObject({ status: 400 });
    expect(f.entryQueries).toEqual([]);
  });
  it.each([0, 21])("rejects out-of-bounds pagination limit %s", async limit => {
    await expect(readCompendiumSummary(caller.actor, "entries", { kind: "spells", targetId: "foreign", limit })).rejects.toMatchObject({ status: 400 });
    expect(f.entryQueries).toEqual([]);
  });
  it("scopes foreign entry targets to the current campaign without returning notes", async () => {
    const result = await readCompendiumSummary(caller.actor, "entries", { kind: "spells", targetId: "foreign" });

    expect(result.data).toEqual({ entries: [], hasMore: false, notesRequireSelection: true });
    expect(f.entryQueries).toEqual([{ where: { campaignId: "campaign", kind: "spells", localId: "foreign" }, skip: 0, take: 21, orderBy: { canonicalKey: "asc" }, select: { canonicalKey: true, originalName: true, edition: true } }]);
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
