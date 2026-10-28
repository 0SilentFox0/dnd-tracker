import { describe, expect, it } from "vitest";

import type { PlanContext } from "../plan";
import { confirmImport, type ImportRepository,previewImport } from "../service";

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const input = { json: JSON.stringify({ feat: [{ name: "Synthetic", source: "Test" }] }) };

const secret = "a-long-test-only-signing-key-for-import-preview";

function repository() {
  let state = { domain: [] as Array<{ id: string; body: Record<string, unknown> }>, entries: [] as PlanContext["existing"], runs: new Map<string, { requestHash: string; report: unknown }>() };

  let fail = false;

  const repo: ImportRepository = {
    authorize: async () => undefined,
    loadContext: async () => ({ campaignId: "c", existing: state.entries }),
    findRun: async (_actor, key) => state.runs.get(key) as Awaited<ReturnType<ImportRepository["findRun"]>>,
    transaction: async (_actor, callback) => { const before = structuredClone(state);

 try { return await callback(repo); } catch (e) { state = before; throw e; } },
    write: async (_actor, row) => { const id = row.localId;

 state.domain.push({ id, body: row.body });

 return id; },
    saveEntry: async (_actor, row) => { if (fail) throw Error("synthetic storage failure");

 state.entries.push({ key: row.key, localId: row.localId, body: row.body, baseline: row.body }); },
    saveSources: async () => undefined,
    saveRun: async (_actor, key, requestHash, report) => { state.runs.set(key, { requestHash, report }); },
  };

  return { repo, state: () => state, fail: () => { fail = true; } };
}

describe("preview and atomic confirmation", () => {
  it("validates untrusted options rather than accepting arbitrary rules or binding kinds", async () => {
    const db = repository();

    await expect(previewImport(actor, { ...input, rulesPatch: { classes: { enabled: "yes" } } }, secret, db.repo)).rejects.toThrow(/INPUT/);
    await expect(previewImport(actor, { ...input, bindings: { k: { kind: "unexpected", id: "x" } } } as never, secret, db.repo)).rejects.toThrow(/INPUT/);
  });
  it("preview never writes; confirm writes once and duplicate submission is idempotent", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    expect(db.state().domain).toHaveLength(0);

    const first = await confirmImport(actor, input, preview.token, "request-1", secret, db.repo);

    expect(first.counts.created).toBe(1);
    expect(await confirmImport(actor, input, preview.token, "request-1", secret, db.repo)).toEqual(first);
    expect(db.state().domain).toHaveLength(1);
  });

  it("rejects stale or tampered preview and wrong actor before writes", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    await expect(confirmImport(actor, { json: input.json.replace("Synthetic", "Changed") }, preview.token, "id", secret, db.repo)).rejects.toThrow(/PREVIEW/);
    await expect(confirmImport({ ...actor, userId: "other" }, input, preview.token, "id", secret, db.repo)).rejects.toThrow(/PREVIEW/);
    await expect(previewImport({ ...actor, isDM: false }, input, secret, db.repo)).rejects.toThrow(/FORBIDDEN/);
    await expect(previewImport({ ...actor, via: "token" }, input, secret, db.repo)).rejects.toThrow(/FORBIDDEN/);
    expect(db.state().domain).toHaveLength(0);
  });

  it("rolls back domain and provenance together on failure", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    db.fail();
    await expect(confirmImport(actor, input, preview.token, "id", secret, db.repo)).rejects.toThrow("synthetic storage failure");
    expect(db.state().domain).toHaveLength(0);
    expect(db.state().entries).toHaveLength(0);
    expect(db.state().runs.size).toBe(0);
  });

  it("returns actionable unresolved refs and rejects commit", async () => {
    const db = repository();

    const bad = { json: JSON.stringify({ background: [{ name: "Past", source: "T", feats: [{ "Absent|T": true }] }] }) };

    const preview = await previewImport(actor, bad, secret, db.repo);

    expect(preview.report.nextActions.some((a) => a.code === "UNRESOLVED_REF")).toBe(true);
    await expect(confirmImport(actor, bad, preview.token, "id", secret, db.repo)).rejects.toThrow(/PLAN_ERRORS/);
    expect(db.state().domain).toHaveLength(0);
  });
});
it("counts imported corpus manifests and data containers once, rather than reporting their chapters as skipped", async () => {
  const db = repository();

  const value = { categories: ["book", "bookData"], json: JSON.stringify({ book: [{ id: "b", name: "Synthetic Book", source: "T" }], bookData: [{ id: "b", source: "T", data: [{ name: "One", entries: ["Synthetic first"] }, { name: "Two", entries: ["Synthetic second"] }] }] }) };

  const result = await previewImport(actor, value, secret, db.repo);

  expect(result.report.countsByCategory.book).toMatchObject({ present: 1, mapped: 1, skipped: 0 });
  expect(result.report.countsByCategory.bookData).toMatchObject({ present: 1, mapped: 1, skipped: 0 });

  const first = result.report.rows[0];

  const excluded = await previewImport(actor, { ...value, excludedKeys: [first.canonicalKey] }, secret, db.repo);

  expect(excluded.report.countsByCategory.book.mapped).toBe(1);

  const none = await previewImport(actor, { ...value, excludedKeys: result.report.rows.map(r => r.canonicalKey) }, secret, db.repo);

  expect(none.report.countsByCategory.book).toMatchObject({ mapped: 0, skipped: 1 });
});
