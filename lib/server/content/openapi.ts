import type { ZodType } from "zod";

import "server-only";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { inputJsonSchema, SHARED_SCHEMAS, toJsonSchemas } from "@/lib/server/content/json-schema";
import { CONTENT_OPERATION_LIST, type ContentOperation, type OperationResponse } from "@/lib/server/content/operations";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { NEED } from "@/lib/utils/api/need";
import { capitalize } from "@/lib/utils/common/text";

const BASE = "/api/campaigns/{id}";

const ERROR_RESPONSES: Record<number, { id: string; description: string }> = {
  400: { id: "BadRequest", description: "Невалідний запит" },
  401: { id: "Unauthorized", description: "Немає або недійсний токен" },
  403: { id: "Forbidden", description: "Немає прав або токен іншої кампанії" },
  404: { id: "NotFound", description: "Не знайдено в цій кампанії" },
  409: { id: "Conflict", description: "Конфлікт" },
  422: { id: "Unprocessable", description: "Недійсні дані (іконка тощо)" },
};

const BASE_ERRORS = [400, 401, 403];

const ref = (id: string) => ({ $ref: `#/components/schemas/${id}` });

const responseRef = (id: string) => ({ $ref: `#/components/responses/${id}` });

const SUCCESS_RESPONSES: Record<OperationResponse, { id: string; schema: object }> = {
  item: { id: "ItemOk", schema: ref("ContentItem") },
  list: { id: "ListOk", schema: { type: "array", items: { type: "object", additionalProperties: true } } },
  ok: { id: "OkOk", schema: ref("Ok") },
  object: { id: "ObjectOk", schema: { type: "object", additionalProperties: true } },
};

const pascal = (s: string) => s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(capitalize).join("");

export type OpenApiOperation = { operationId: string; "x-scopes": string[]; parameters?: unknown[]; requestBody?: unknown; responses: Record<string, unknown>; [key: string]: unknown };

export type OpenApiDocument = Record<string, unknown> & {
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: { schemas: Record<string, unknown>; responses: Record<string, unknown>; parameters: Record<string, unknown>; [key: string]: unknown };
};

type OpSpec = Omit<ContentOperation, "description"> & { description?: string; status?: number; notFound?: boolean };

const resources = Object.values(CONTENT_RESOURCES) as AnyContentResource[];

const operations = CONTENT_OPERATION_LIST.filter((op) => !op.need.sessionOnly);

function resourceSpecs(r: AnyContentResource): OpSpec[] {
  const item = `${r.path}/{${r.idParam}}`;

  const base = { tag: r.label, response: "item" } as const;

  return [
    { ...base, id: `${r.kind}.list`, method: "GET", path: r.path, summary: `${r.label}: список`, description: r.description, need: NEED.read(r.access.list), query: r.schemas.query, response: "list", notFound: false },
    { ...base, id: `${r.kind}.create`, method: "POST", path: r.path, summary: `${r.label}: створити`, description: r.description, need: NEED.write, body: r.schemas.apiCreate ?? r.schemas.create, errors: r.errors, status: 201, notFound: false },
    { ...base, id: `${r.kind}.get`, method: "GET", path: item, summary: `${r.label}: один запис`, need: NEED.read(r.access.item) },
    { ...base, id: `${r.kind}.update`, method: "PATCH", path: item, summary: `${r.label}: змінити`, need: NEED.write, body: r.schemas.update, errors: r.errors },
    { ...base, id: `${r.kind}.delete`, method: "DELETE", path: item, summary: `${r.label}: видалити`, need: NEED.write, response: "ok" },
  ];
}

const pathParams = (path: string, enums: OpSpec["pathEnums"] = {}) =>
  [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1] === "id" ? { $ref: "#/components/parameters/CampaignId" } : ({ name: m[1], in: "path", required: true, schema: { type: "string", ...(enums[m[1]] && { enum: enums[m[1]] }) } }));

function queryParams(schema: ZodType | undefined) {
  if (!schema) return [];

  const { properties = {}, required = [] } = inputJsonSchema(schema) as { properties?: Record<string, unknown>; required?: string[] };

  return Object.entries(properties).map(([name, prop]) => ({ name, in: "query", required: required.includes(name), schema: prop }));
}

export function buildOpenApi(): OpenApiDocument {
  const specs: OpSpec[] = [...resources.flatMap(resourceSpecs), ...operations];

  const entries: Array<readonly [ZodType, string]> = [];

  for (const r of resources) {
    const id = pascal(r.kind);

    entries.push([r.schemas.apiCreate ?? r.schemas.create, r.schemas.apiCreate ? `${id}ApiCreate` : `${id}Create`], [r.schemas.update, `${id}Update`]);
  }

  for (const op of operations) {
    if (op.body) entries.push([op.body, `${pascal(op.id)}Body`]);
  }

  const idBySchema = new Map<ZodType, string>();

  for (const [schema, id] of [...SHARED_SCHEMAS, ...entries]) {
    if (!idBySchema.has(schema)) idBySchema.set(schema, id);
  }

  const paths: OpenApiDocument["paths"] = {};

  for (const spec of specs) {
    const scope = spec.need.scope;

    const p = `${BASE}${spec.path}`;

    const codes = [...new Set([...BASE_ERRORS, ...(spec.notFound ?? true ? [404] : []), ...(spec.errors ?? [])])].sort((a, b) => a - b);

    const bodyId = spec.body && idBySchema.get(spec.body);

    const operation: OpenApiOperation = {
      operationId: spec.id,
      summary: spec.summary,
      description: `${spec.description ? `${spec.description}\n\n` : ""}Права токена: ${scope}${spec.need.access === "dm" ? "; з сесії — лише ДМ" : ""}.`,
      tags: [spec.tag],
      "x-scopes": [scope],
      parameters: [...pathParams(p, spec.pathEnums), ...queryParams(spec.query)],
      ...(bodyId && { requestBody: { required: true, content: { "application/json": { schema: ref(bodyId) } } } }),
      responses: {
        [spec.status ?? 200]: responseRef(SUCCESS_RESPONSES[spec.response].id),
        ...Object.fromEntries(codes.map((c) => [c, responseRef(ERROR_RESPONSES[c].id)])),
      },
    };

    (paths[p] ??= {})[spec.method.toLowerCase()] = operation;
  }

  return {
    openapi: "3.1.0",
    info: { title: "D&D Tracker — Content API", version: "2c" },
    servers: [{ url: "/" }],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      responses: {
        ...Object.fromEntries(Object.values(ERROR_RESPONSES).map(({ id, description }) => [id, { description, content: { "application/json": { schema: ref("Error") } } }])),
        ...Object.fromEntries(Object.values(SUCCESS_RESPONSES).map(({ id, schema }) => [id, { description: "Успіх", content: { "application/json": { schema } } }])),
      },
      parameters: { CampaignId: { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Id кампанії" } },
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "Токен з /dm/ai (права content:read / content:write)." } },
      schemas: {
        ...toJsonSchemas(entries),
        ContentItem: { type: "object", required: ["id", "name"], properties: { id: { type: "string" }, name: { type: "string" } }, additionalProperties: true },
        Ok: { type: "object", required: ["ok"], properties: { ok: { type: "boolean", const: true } } },
        Error: { type: "object", required: ["error"], properties: { error: { type: "string" }, issues: { type: "array", items: {} } } },
      },
    },
  };
}

let cached: OpenApiDocument | undefined;

export const getOpenApiDocument = () => (cached ??= buildOpenApi());
