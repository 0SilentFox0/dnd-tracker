import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import { defineResource } from "@/lib/server/content/define-resource";
import { importContent,type ImportDeps } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";
import type { ImportMode } from "@/types/content-import";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

type Key = { id: string; name: string; slug: string | null };

let keys: Key[];

const create = vi.fn(async (_a: unknown, input: Record<string, unknown>) => ({ id: "new", name: String(input.name) }));

const update = vi.fn(async (_a: unknown, existing: { id: string }, input: Record<string, unknown>) => ({ ...existing, ...input }));

const writeSlug = vi.fn(async () => undefined);

const resource = defineResource({
  kind: "units",
  listFields: [],
  idParam: "unitId",
  label: "Units",
  description: "",
  path: "/units",
  schemas: { create: createUnitSchema, update: updateUnitSchema },
  access: { list: "member", item: "member" },
  invalidates: ["units"],
  notFound: "none",
  list: async () => [],
  find: (async (_a: unknown, id: string) => ({ id, name: keys.find((k) => k.id === id)?.name ?? "x" })) as never,
  create: create as never,
  update: update as never,
  remove: async () => {},
});

const deps = (): ImportDeps => ({ resource: () => resource, loadNames: async () => [], loadKeys: async () => keys, writeSlug });

const run = (rows: Record<string, unknown>[], mode: ImportMode = "update", dryRun = false) => importContent(actor, "units", { rows, mode, dryRun }, deps());

beforeEach(() => {
  vi.clearAllMocks();
  keys = [];
});

describe("importContent slug matching", () => {
  it("creates a new row with a slug and records it", async () => {
    const report = await run([{ name: "Archer", slug: "archer" }]);

    expect(report.counts.created).toBe(1);
    expect(writeSlug).toHaveBeenCalledWith("c1", "units", "new", "archer");
  });

  it("backfills the slug of a row matched by name", async () => {
    keys = [{ id: "u1", name: "Archer", slug: null }];

    const report = await run([{ name: "Archer", slug: "archer" }]);

    expect(report.counts.updated).toBe(1);
    expect(update.mock.calls[0][1]).toMatchObject({ id: "u1" });
    expect(writeSlug).toHaveBeenCalledWith("c1", "units", "u1", "archer");
  });

  it("matches by slug when the name changed: same id, no duplicate", async () => {
    keys = [{ id: "u1", name: "Archer", slug: "archer" }];

    const report = await run([{ name: "Longbow Archer", slug: "archer" }]);

    expect(report.counts).toMatchObject({ updated: 1, created: 0 });
    expect(create).not.toHaveBeenCalled();
    expect(update.mock.calls[0][1]).toMatchObject({ id: "u1" });
    expect(update.mock.calls[0][2]).toMatchObject({ name: "Longbow Archer" });
    expect(writeSlug).not.toHaveBeenCalled();
  });

  it("rejects the second row with the same slug", async () => {
    const report = await run([{ name: "A", slug: "same" }, { name: "B", slug: "same" }]);

    expect(report.results[1]).toMatchObject({ status: "error", issues: [expect.objectContaining({ field: "slug", message: "contentImport.issues.duplicateSlug" })] });
    expect(report.counts.created).toBe(1);
  });

  it("rejects an invalid slug", async () => {
    const report = await run([{ name: "A", slug: "Bad Slug" }]);

    expect(report.results[0]).toMatchObject({ status: "error", issues: [expect.objectContaining({ field: "slug", message: "contentImport.issues.invalidSlug" })] });
  });

  it("a record without slug behaves as before", async () => {
    keys = [{ id: "u1", name: "Archer", slug: "archer" }];

    const report = await run([{ name: "Archer" }, { name: "Fresh" }]);

    expect(report.counts).toMatchObject({ updated: 1, created: 1 });
    expect(writeSlug).not.toHaveBeenCalled();
  });

  it("a new row does not steal a renamed row that another incoming slug claims", async () => {
    keys = [{ id: "r1", name: "Foo", slug: "b" }];

    const report = await run([{ name: "Foo", slug: "a" }, { name: "Bar", slug: "b" }]);

    expect(report.counts).toMatchObject({ created: 1, updated: 1 });
    expect(create.mock.calls[0][1]).toMatchObject({ name: "Foo" });
    expect(update.mock.calls[0][1]).toMatchObject({ id: "r1" });
    expect(update.mock.calls[0][2]).toMatchObject({ name: "Bar" });
    expect(writeSlug).toHaveBeenCalledTimes(1);
  });

  it("dry run writes nothing", async () => {
    await run([{ name: "Archer", slug: "archer" }], "update", true);

    expect(writeSlug).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
