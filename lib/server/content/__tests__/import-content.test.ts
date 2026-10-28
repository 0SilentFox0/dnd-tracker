import { beforeEach, describe, expect, it, vi } from "vitest";

const invalidateReference = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference }));
vi.mock("@/lib/server/content/resources", () => ({ CONTENT_RESOURCES: {} }));

import type { ZodType } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { createArtifactSchema, createArtifactSetSchema, createClassSchema, createFeatSchema, createMainSkillSchema, createRaceSchema, createSkillSchema, createSpellGroupSchema, createSpellSchema } from "@/lib/schemas";
import { createUnitSchema, updateUnitSchema } from "@/lib/schemas/units";
import { type AnyContentResource, defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { compactImportReport, importContent, type ImportDeps } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";
import { IMPORT_KINDS, IMPORT_SPECS } from "@/lib/utils/content/import";
import type { IdName } from "@/types/common";
import type { ImportKind, ImportMode } from "@/types/content-import";

const actor: Actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

let names: Record<string, IdName[]>;

const create = vi.fn(async (_a: unknown, input: Record<string, unknown>) => ({ id: "new", name: String(input.name) }));

const update = vi.fn(async (_a: unknown, existing: { id: string }, input: Record<string, unknown>) => ({ ...existing, ...input }));

const find = vi.fn(async (_a: unknown, id: string) => ({ id, name: "наявний" }));

const resource = defineResource({
  kind: "units",
  listFields: [],
  idParam: "unitId",
  label: "Юніти",
  description: "",
  path: "/units",
  schemas: { create: createUnitSchema, update: updateUnitSchema },
  access: { list: "member", item: "member" },
  invalidates: ["units"],
  notFound: "Немає",
  list: async () => [],
  find: find as never,
  create: create as never,
  update: update as never,
  remove: async () => {},
});

const deps: ImportDeps = { resource: () => resource, loadNames: async (_c, kind) => names[kind] ?? [] };

const run = (rows: Record<string, unknown>[], mode: ImportMode = "create", dryRun = false, who: Actor = actor) => importContent(who, "units", { rows, mode, dryRun }, deps);

describe("importContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    names = {
      units: [{ id: "u1", name: "Вовк" }],
      races: [{ id: "r1", name: "Гноми" }, { id: "r2", name: "Гноми" }],
      spells: [{ id: "s1", name: "Вогонь" }],
    };
  });

  it("create: новий запис створюється, наявна назва — помилка рядка; лічильники", async () => {
    const report = await run([{ name: "Біс", maxHp: "18 (4к6)" }, { name: "  вовк " }]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1]).toMatchObject({ name: "Біс", maxHp: 18, level: 1 });
    expect(report.results.map((r) => r.status)).toEqual(["created", "error"]);
    expect(report.results[1].issues[0].message).toBe("«вовк» вже є в кампанії");
    expect(report.counts).toEqual({ created: 1, updated: 0, skipped: 0, error: 1 });
    expect(invalidateReference).toHaveBeenCalledWith(["units"], "c1");
  });

  it("update: наявний — оновлення лише наданими полями (порожні клітинки не скидають); відсутній — створення", async () => {
    const report = await run([{ name: "Вовк", maxHp: "20", speed: "" }, { name: "Біс" }], "update");

    expect(find).toHaveBeenCalledWith(actor, "u1", "write");
    expect(update.mock.calls[0][2]).toEqual({ name: "Вовк", maxHp: 20 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(report.results.map((r) => r.status)).toEqual(["updated", "created"]);
  });

  it("update: кілька наявних з однією назвою — перший і попередження", async () => {
    names.units = [{ id: "u1", name: "Вовк" }, { id: "u2", name: "вовк" }];

    const report = await run([{ name: "Вовк" }], "update");

    expect(find).toHaveBeenCalledWith(actor, "u1", "write");
    expect(report.results[0].issues).toEqual([{ level: "warning", message: "Кілька записів «Вовк» — оновлено перший" }]);
  });

  it("skip: наявні пропускаються без запису", async () => {
    const report = await run([{ name: "Вовк" }, { name: "Біс" }], "skip");

    expect(report.results.map((r) => r.status)).toEqual(["skipped", "created"]);
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("посилання: назва без регістру й пробілів, точний id, кілька однакових — перша", async () => {
    const report = await run([
      { name: "А", raceId: "  гноми ", knownSpells: "вогонь" },
      { name: "Б", raceId: "r2" },
    ]);

    expect(create.mock.calls.map((c) => [c[1].raceId, c[1].knownSpells])).toEqual([["r1", ["s1"]], ["r2", []]]);
    expect(report.results.map((r) => r.status)).toEqual(["created", "created"]);
  });

  it("невідоме посилання в необов'язковому полі — попередження, значення null, рядок записано", async () => {
    const report = await run([{ name: "В", raceId: "Ельфи", knownSpells: ["Вогонь", "Лід"] }]);

    expect(report.results[0].status).toBe("created");
    expect(report.results[0].issues).toEqual([
      { field: "raceId", level: "warning", message: "Раса: не знайдено «Ельфи» (Раси)" },
      { field: "knownSpells", level: "warning", message: "Заклинання: не знайдено «Лід» (Заклинання)" },
    ]);
    expect(create.mock.calls[0][1]).toMatchObject({ raceId: null, knownSpells: ["s1"] });
  });

  it("update: одне невідоме заклинання у списку не відв'язує наявні — ключ пропускається", async () => {
    const report = await run([{ name: "Вовк", knownSpells: ["Вогонь", "Невідоме"] }], "update");

    expect(update.mock.calls[0][2]).not.toHaveProperty("knownSpells");
    expect(report.results[0].issues).toHaveLength(1);
  });

  it("невідоме посилання в необов'язковому полі при update не скидає наявне значення", async () => {
    await run([{ name: "Вовк", raceId: "Ельфи" }], "update");

    expect(update.mock.calls[0][2]).not.toHaveProperty("raceId");
  });

  it("невідоме посилання в обов'язковому полі — помилка рядка, не записано", async () => {
    const field = IMPORT_SPECS.units.fields.find((f) => f.key === "raceId") as { required?: boolean };

    field.required = true;

    try {
      const report = await run([{ name: "Г", raceId: "Ельфи" }]);

      expect(report.results[0].status).toBe("error");
      expect(report.results[0].issues).toEqual([{ field: "raceId", level: "error", message: "Раса: не знайдено «Ельфи» (Раси)" }]);
      expect(create).not.toHaveBeenCalled();
    } finally {
      delete field.required;
    }
  });

  it("частковий успіх: погане значення й помилка схеми — помилки рядків, валідний записано", async () => {
    const report = await run([{ name: "А", maxHp: "багато" }, { name: "Б", level: "50" }, { name: "В" }, {}]);

    expect(report.results.map((r) => r.status)).toEqual(["created", "error", "created", "error"]);
    expect(report.results[0].issues[0]).toMatchObject({ field: "maxHp", level: "warning" });
    expect(report.results[1].issues[0]).toMatchObject({ field: "level", level: "error" });
    expect(report.results[3].issues).toEqual([{ field: "name", level: "error", message: "Немає назви" }]);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("dryRun: нічого не пише й не скидає кеш, статуси — заплановані", async () => {
    const report = await run([{ name: "Вовк" }, { name: "Біс" }], "update", true);

    expect(report.dryRun).toBe(true);
    expect(report.results.map((r) => r.status)).toEqual(["updated", "created"]);
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("дублі назв у файлі: create — помилка другого, skip — пропуск другого", async () => {
    expect((await run([{ name: "Біс" }, { name: "БІС" }])).results.map((r) => r.status)).toEqual(["created", "error"]);
    expect((await run([{ name: "Біс" }, { name: "біс" }], "skip")).results.map((r) => r.status)).toEqual(["created", "skipped"]);
  });

  it("права: гравець і токен лише з content:read — 403, нічого не читається", async () => {
    await expect(run([{ name: "А" }], "create", false, { ...actor, isDM: false })).rejects.toMatchObject({ status: 403 });
    await expect(run([{ name: "А" }], "create", false, { ...actor, via: "token", scopes: ["content:read"] })).rejects.toBeInstanceOf(ContentError);
    expect(create).not.toHaveBeenCalled();
  });

  it("помилка запису: ContentError — її текст; інша — загальний текст; решта рядків пишеться", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    create.mockRejectedValueOnce(new ContentError("Раса «А» уже є в кампанії", 409)).mockRejectedValueOnce(new Error("db down"));

    const report = await run([{ name: "А" }, { name: "Б" }, { name: "В" }]);

    expect(report.results.map((r) => [r.status, r.issues[0]?.message])).toEqual([["error", "Раса «А» уже є в кампанії"], ["error", API_ERRORS.IMPORT_ROW_FAILED], ["created", undefined]]);
    expect(error).toHaveBeenCalledWith("[content import]", "units", "Error");
    error.mockRestore();
  });

  it("нічого не записано — кеш не скидається", async () => {
    await run([{ name: "Вовк" }]);

    expect(invalidateReference).not.toHaveBeenCalled();
  });

  it("deps.invalidate замінює інвалідацію кешу Next (скрипти поза Next)", async () => {
    const invalidate = vi.fn();

    await importContent(actor, "units", { rows: [{ name: "Біс" }], mode: "create", dryRun: false }, { resource: () => resource, loadNames: async (_c, kind) => names[kind] ?? [], invalidate });

    expect(invalidate).toHaveBeenCalledWith(["units"], "c1");
    expect(invalidateReference).not.toHaveBeenCalled();
  });
});

const CREATE: Record<ImportKind, ZodType> = {
  units: createUnitSchema,
  spells: createSpellSchema,
  skills: createSkillSchema,
  "main-skills": createMainSkillSchema,
  "spell-groups": createSpellGroupSchema,
  races: createRaceSchema,
  classes: createClassSchema,
  feats: createFeatSchema,
  artifacts: createArtifactSchema,
  "artifact-sets": createArtifactSetSchema,
};

describe("importContent: кожен вид", () => {
  it.each(IMPORT_KINDS)("%s: перший рядок прикладу (сирі клітинки під ключами полів) проходить серверний шлях", async (kind) => {
    const row = Object.fromEntries(IMPORT_SPECS[kind].fields.map((f) => [f.key, f.examples[0]]));

    const kindResource: AnyContentResource = { ...resource, schemas: { create: CREATE[kind], update: CREATE[kind] } };

    const report = await importContent(actor, kind, { rows: [row], mode: "create", dryRun: true }, { resource: () => kindResource, loadNames: async () => [] });

    expect(report.results[0]).toMatchObject({ status: "created", issues: [] });
  });
});

describe("compactImportReport", () => {
  it("лише рядки з помилками/попередженнями, до ліміту, решта — omitted", () => {
    const results = [
      { row: 1, status: "created" as const, issues: [] },
      ...Array.from({ length: 3 }, (_, i) => ({ row: i + 2, status: "error" as const, issues: [{ level: "error" as const, message: "x" }] })),
    ];

    const compact = compactImportReport({ dryRun: false, results, counts: { created: 1, updated: 0, skipped: 0, error: 3 } }, 2);

    expect(compact.rows.map((r) => r.row)).toEqual([2, 3]);
    expect(compact.omitted).toBe(1);
    expect(compact.counts.error).toBe(3);
  });
});
