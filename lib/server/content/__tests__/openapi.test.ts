import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

const routes = (import.meta as unknown as { glob: (pattern: string) => Record<string, () => Promise<Record<string, unknown>>> }).glob("/app/api/campaigns/**/route.ts");

import { buildOpenApi } from "@/lib/server/content/openapi";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

const doc = buildOpenApi();

const ops = Object.entries(doc.paths).flatMap(([path, methods]) => Object.entries(methods).filter(([m]) => m !== "parameters").map(([method, op]) => ({ path, method, op })));

const opById = (id: string) => ops.find((o) => o.op.operationId === id);

function requiredOp(id: string) {
  const found = opById(id);

  if (!found) throw Error(`Missing OpenAPI operation: ${id}`);

  return found;
}

describe("buildOpenApi", () => {
  it("OpenAPI 3.1 з bearerAuth", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.components).toMatchObject({ securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } });
  });

  it.each(Object.values(CONTENT_RESOURCES))("$kind: list/create/get/update/delete", (r) => {
    for (const verb of ["list", "create", "get", "update", "delete"]) expect(opById(`${r.kind}.${verb}`)).toBeDefined();
  });

  it("усі операції не-sessionOnly є, sessionOnly — немає", () => {
    for (const op of Object.values(CONTENT_OPERATIONS)) expect(Boolean(opById(op.id))).toBe(!op.need.sessionOnly);
  });

  it("масового DELETE колекції немає", () => {
    for (const r of Object.values(CONTENT_RESOURCES)) expect(doc.paths[`/api/campaigns/{id}${r.path}`]).not.toHaveProperty("delete");
  });

  it("кожна операція має x-scopes і operationId; scope читання/запису відповідає методу ресурсу", () => {
    for (const { op } of ops) expect(op["x-scopes"]).toHaveLength(1);
    expect(requiredOp("units.list").op["x-scopes"]).toEqual(["content:read"]);
    expect(requiredOp("units.create").op["x-scopes"]).toEqual(["content:write"]);
    expect(requiredOp("abilities.get").op["x-scopes"]).toEqual(["content:read"]);
  });

  it("шляхи документа відповідають route.ts з тим самим методом", async () => {
    for (const { path, method } of ops) {
      const file = `/app${path.replace(/\{(\w+)\}/g, "[$1]")}/route.ts`;

      expect(routes[file], file).toBeDefined();
      expect(typeof (await routes[file]())[method.toUpperCase()], `${method} ${file}`).toBe("function");
    }
  });

  it("здібності йдуть через $ref, документ компактний", () => {
    const json = JSON.stringify(doc);

    expect(JSON.stringify(doc.components.schemas.UnitsCreate)).toContain("#/components/schemas/Ability");
    expect(json.match(/"trigger":\{"\$ref"/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(json.length).toBeLessThan(165_000);
  });

  it("query-параметри spells?ids і skills?mainSkillId", () => {
    expect(requiredOp("spells.list").op.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "ids", in: "query" })]));
    expect(requiredOp("skills.list").op.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "mainSkillId", in: "query" })]));
  });

  it("треки через API — лише YouTube", () => {
    const body = JSON.stringify(requiredOp("tracks.create").op.requestBody);

    expect(body).toContain("TracksApiCreate");
    expect(doc.components.schemas).not.toHaveProperty("TracksCreate");
    expect(JSON.stringify(doc.components.schemas.TracksApiCreate)).not.toContain('"file"');
  });

  it("усі $ref ведуть на наявні компоненти", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)].map((m) => m[1]);

    for (const id of new Set(refs)) expect(doc.components.schemas, id).toHaveProperty([id]);
  });

  it("помилки йдуть через components.responses, усі $ref резолвляться", () => {
    const refs = [...JSON.stringify(doc.paths).matchAll(/"\$ref":"#\/components\/responses\/([^"]+)"/g)].map((m) => m[1]);

    expect(refs.length).toBeGreaterThan(100);

    for (const id of new Set(refs)) expect(doc.components.responses, id).toHaveProperty([id]);

    expect(JSON.stringify(doc.paths)).not.toContain("Немає або недійсний токен");
    expect(doc.components.parameters).toHaveProperty("CampaignId");
  });

  it("коди помилок ресурсу лише на create/update; 404 не на list/create", () => {
    for (const verb of ["list", "get"]) expect(requiredOp(`races.${verb}`).op.responses).not.toHaveProperty("409");

    expect(requiredOp("races.create").op.responses).toHaveProperty("409");
    expect(requiredOp("races.update").op.responses).toHaveProperty("409");
    for (const kind of ["classes", "feats", "backgrounds"]) expect(requiredOp(`${kind}.delete`).op.responses).toHaveProperty("409");
    expect(requiredOp("artifacts.create").op.responses).toHaveProperty("422");
    expect(requiredOp("skill-trees.save").op.responses).toHaveProperty("409");
    expect(requiredOp("artifacts.get").op.responses).not.toHaveProperty("422");
    expect(requiredOp("units.list").op.responses).not.toHaveProperty("404");
    expect(requiredOp("units.create").op.responses).not.toHaveProperty("404");
    expect(requiredOp("units.get").op.responses).toHaveProperty("404");
  });

  it("abilities.get: kind — enum власників; skill-trees під тегом «Скіли»; ids має опис", () => {
    expect(requiredOp("abilities.get").op.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "kind", schema: { type: "string", enum: ["skill", "race", "class", "artifact", "artifactSet", "unit", "feat"] } })]));
    expect(requiredOp("skill-trees.save").op.tags).toEqual(["Скіли"]);
    expect(requiredOp("skill-trees.list").op.tags).toEqual(["Скіли"]);
    expect(requiredOp("spells.list").op.parameters).toEqual(expect.arrayContaining([expect.objectContaining({ name: "ids", schema: expect.objectContaining({ description: expect.any(String) }) })]));
  });

});
