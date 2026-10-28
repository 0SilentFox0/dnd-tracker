import type { ZodType } from "zod";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { saveSkillTreeSchema } from "@/lib/schemas/skills";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import { effectKind, pascal, toJsonSchemas } from "@/lib/server/content/json-schema";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import type { SchemaTarget } from "@/lib/server/content/schema-targets";
import { NonRandomEffectSchema } from "@/lib/utils/abilities/schema/effects";

export const EFFECT_KINDS: readonly string[] = (NonRandomEffectSchema.options as readonly ZodType[]).map(effectKind);

type Schema = Record<string, unknown>;

const effectStub = `Один з видів ефекту: ${EFFECT_KINDS.join(", ")}. Схема виду: content_schema(kind: "abilities", effectKind: "<вид>")`;

const EFFECT_STOPS: Readonly<Record<string, string>> = {
  Effect: effectStub,
  NonRandomEffect: effectStub,
  ...Object.fromEntries(EFFECT_KINDS.map((k) => [`Effect.${k}`, effectStub])),
};

const STOPS: Readonly<Record<string, string>> = { Ability: 'Схема здібності: content_schema(kind: "abilities")', ...EFFECT_STOPS };

const resources = Object.values(CONTENT_RESOURCES) as AnyContentResource[];

let cache: Record<string, Schema> | undefined;

function components() {
  if (cache) return cache;

  const entries: Array<readonly [ZodType, string]> = [];

  for (const r of resources) {
    entries.push([r.schemas.apiCreate ?? r.schemas.create, `${pascal(r.kind)}Create`], [r.schemas.update, `${pascal(r.kind)}Update`]);
  }

  entries.push([saveSkillTreeSchema, "SkillTreeSave"]);

  return (cache ??= toJsonSchemas(entries, { uriPrefix: "#/$defs/" }));
}

const REF_PREFIX = "#/$defs/";

function collectRefs(node: unknown, out: string[]): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
  } else if (node !== null && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string" && value.startsWith(REF_PREFIX)) out.push(value.slice(REF_PREFIX.length));
      else collectRefs(value, out);
    }
  }

  return out;
}

function build(root: string, stops: Readonly<Record<string, string>>): Schema {
  const all = components();

  const defs: Record<string, Schema> = {};

  const queue = collectRefs(all[root], []);

  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (id in defs) continue;

    if (id in stops) {
      defs[id] = { description: stops[id] };
      continue;
    }

    defs[id] = all[id];
    queue.push(...collectRefs(all[id], []));
  }

  return { ...all[root], $defs: defs };
}

const memo = new Map<string, Schema>();

function compute(input: { kind: SchemaTarget; op?: "create" | "update"; effectKind?: string }): Schema {
  const { kind } = input;

  if (kind === "abilities") {
    if (input.effectKind === undefined) return build("Ability", EFFECT_STOPS);

    if (!EFFECT_KINDS.includes(input.effectKind)) {
      throw new ContentError(API_ERRORS.ASSISTANT_EFFECT_KIND_UNKNOWN, 400, undefined, { kind: input.effectKind, kinds: EFFECT_KINDS.join(", ") });
    }

    return build(`Effect.${input.effectKind}`, {});
  }

  if (kind === "rules") return build("RulesetPatch", STOPS);

  if (kind === "skill-tree") return build("SkillTreeSave", STOPS);

  return build(`${pascal(kind)}${input.op === "update" ? "Update" : "Create"}`, STOPS);
}

export function contentSchema(input: { kind: SchemaTarget; op?: "create" | "update"; effectKind?: string }): Schema {
  const key = `${input.kind}|${input.op ?? ""}|${input.effectKind ?? ""}`;

  let hit = memo.get(key);

  if (!hit) {
    hit = compute(input);
    memo.set(key, hit);
  }

  return hit;
}
