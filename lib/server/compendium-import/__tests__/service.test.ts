import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { COMPENDIUM_LIMITS, CompendiumError } from "../parse";
import type { PlanContext } from "../plan";
import { confirmImport, type ImportRepository,previewImport } from "../service";

const actor = { campaignId: "c", userId: "dm", isDM: true, via: "session" as const, scopes: null };

const input = { json: JSON.stringify({ feat: [{ name: "Synthetic", source: "Test" }] }) };

const secret = "a-long-test-only-signing-key-for-import-preview";

afterEach(() => vi.restoreAllMocks());

function signedToken(data: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");

  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
}

function observeWrites(repo: ImportRepository) {
  return (["write", "saveEntry", "saveSources", "saveRun"] as const).map(method => vi.spyOn(repo, method));
}

function expectNoWrites(writers: ReturnType<typeof observeWrites>) {
  for (const write of writers) expect(write).not.toHaveBeenCalled();
}

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
  it.each([
    ["actor", "PREVIEW_STALE"], ["campaign", "PREVIEW_STALE"], ["fingerprint", "PREVIEW_STALE"],
    ["planHash", "PREVIEW_STALE"], ["signature", "PREVIEW_INVALID"], ["oversized", "PREVIEW_INVALID"],
  ])("rejects changed %s before all writers", async (field, code) => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    const writers = observeWrites(db.repo);

    const data = JSON.parse(Buffer.from(preview.token.split(".")[0], "base64url").toString()) as Record<string, unknown>;

    const token = field === "signature" ? preview.token + "x" : field === "oversized" ? "x".repeat(4097) : field === "planHash" ? signedToken({ ...data, planHash: "changed" }) : preview.token;

    await expect(confirmImport({ ...actor, ...(field === "actor" ? { userId: "other" } : {}), ...(field === "campaign" ? { campaignId: "other" } : {}) }, field === "fingerprint" ? { json: input.json.replace("Synthetic", "Changed") } : input, token, "reject", secret, db.repo)).rejects.toThrow(expect.objectContaining({ code }));
    expectNoWrites(writers);
  });

  it.each([0, 1])("preserves the exact 15-minute expiration comparison (milliseconds after expiry: %s)", async (over) => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);

    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    const writers = observeWrites(db.repo);

    now.mockReturnValue(1_800_000_000_000 + 15 * 60_000 + over);

    const confirm = confirmImport(actor, input, preview.token, "expiry", secret, db.repo);

    if (over) {
      await expect(confirm).rejects.toThrow(expect.objectContaining({ code: "PREVIEW_STALE" }));
      expectNoWrites(writers);
    } else await expect(confirm).resolves.toMatchObject({ counts: { created: 1 } });
  });

  it("accepts a correctly signed token at exactly 4096 characters", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    const data = { ...JSON.parse(Buffer.from(preview.token.split(".")[0], "base64url").toString()), padding: "" };

    data.padding = "x".repeat(3039 - Buffer.byteLength(JSON.stringify(data)));

    const token = signedToken(data);

    expect(token).toHaveLength(4096);
    await expect(confirmImport(actor, input, token, "max-token", secret, db.repo)).resolves.toMatchObject({ counts: { created: 1 } });
  });

  it("requires a 32-character secret at preview and confirm", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, "s".repeat(32), db.repo);

    const writers = observeWrites(db.repo);

    await expect(previewImport(actor, input, "s".repeat(31), db.repo)).rejects.toThrow(expect.objectContaining({ code: "PREVIEW_SECRET_REQUIRED" }));
    await expect(confirmImport(actor, input, preview.token, "secret", "s".repeat(31), db.repo)).rejects.toThrow(expect.objectContaining({ code: "PREVIEW_SECRET_REQUIRED" }));
    expectNoWrites(writers);
    await expect(confirmImport(actor, input, preview.token, "secret", "s".repeat(32), db.repo)).resolves.toMatchObject({ counts: { created: 1 } });
  });

  it("rechecks live authorization inside the confirmation transaction", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    const writers = observeWrites(db.repo);

    let transactionActive = false;

    const transaction = db.repo.transaction;

    vi.spyOn(db.repo, "transaction").mockImplementation(async (actor, callback) => {
      transactionActive = true;

      try { return await transaction(actor, callback); } finally { transactionActive = false; }
    });

    vi.spyOn(db.repo, "authorize").mockImplementation(async () => {
      expect(transactionActive).toBe(true);
      throw new CompendiumError("FORBIDDEN");
    });
    await expect(confirmImport(actor, input, preview.token, "revoked", secret, db.repo)).rejects.toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expectNoWrites(writers);
  });

  it("rejects changed repository state after preview before writes", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    const writers = observeWrites(db.repo);

    vi.spyOn(db.repo, "loadContext").mockResolvedValue({ campaignId: "c", existing: [], settingsHash: "changed-after-preview" });
    await expect(confirmImport(actor, input, preview.token, "stale-plan", secret, db.repo)).rejects.toThrow(expect.objectContaining({ code: "PREVIEW_STALE" }));
    expectNoWrites(writers);
  });

  it("replays the saved report without writers and rejects a different request with the same key", async () => {
    const db = repository();

    const preview = await previewImport(actor, input, secret, db.repo);

    const first = await confirmImport(actor, input, preview.token, "same-key", secret, db.repo);

    const writers = observeWrites(db.repo);

    await expect(confirmImport(actor, input, preview.token, "same-key", secret, db.repo)).resolves.toEqual(first);
    await expect(confirmImport(actor, { json: input.json.replace("Synthetic", "Other") }, preview.token, "same-key", secret, db.repo)).rejects.toThrow(expect.objectContaining({ code: "IDEMPOTENCY_CONFLICT" }));
    expectNoWrites(writers);
  });

  it.each([0, 1])("bounds serialized request bytes independently of file bytes (over: %s)", async (over) => {
    const db = repository();

    const writers = observeWrites(db.repo);

    const value = { json: "{}" };

    value.json += " ".repeat(COMPENDIUM_LIMITS.requestBytes - Buffer.byteLength(JSON.stringify(value)) + over);

    expect(Buffer.byteLength(JSON.stringify(value))).toBe(COMPENDIUM_LIMITS.requestBytes + over);

    if (over) await expect(previewImport(actor, value, secret, db.repo)).rejects.toThrow(expect.objectContaining({ code: "REQUEST_SIZE" }));
    else await expect(previewImport(actor, value, secret, db.repo)).resolves.toHaveProperty("token");

    expectNoWrites(writers);
  });
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
