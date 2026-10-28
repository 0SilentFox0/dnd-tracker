import { z } from "zod";

import type { ActionPreview, ActionResult, AssistantActionDef, AssistantCaller, AssistantWriteAction, TargetRef } from "../types";
import { contentDeleteCascades, contentDependencies, contentIds } from "./content-dependencies";
import { withContentEffects } from "./content-effects";
import { contentMediaHandoff } from "./content-media";
import { createContentOperationActions } from "./content-operations";
import { createContentReadActions } from "./content-reads";
import { contentSnapshot, jsonContent, snapshotHash } from "./content-snapshot";

import "server-only";
import type { AnyContentResource } from "@/lib/server/content/define-resource";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";
import { createContent, getContent, listContent, removeAllContent, removeContent, updateContent } from "@/lib/server/content/service";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import type { Actor } from "@/lib/utils/api/actor";
import { NEED } from "@/lib/utils/api/need";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";

const idSchema = z.string().min(1).max(200);

const empty = z.object({});

const querySchema = z.object({ query: z.record(z.string(), z.string()).optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) });

export const contentResult = (data: unknown, affected: TargetRef[] = [], warnings: string[] = []): ActionResult => ({ data: jsonContent(data), affected, warnings });

type Deps = {
  resources?: Partial<Record<string, AnyContentResource>>;
  snapshot?: (actor: Actor) => Promise<unknown>;
  guard?: <T>(campaignId: string, callback: () => Promise<T>) => Promise<T>;
};

function validatedBody(resource: AnyContentResource, body: unknown, update: boolean) {
  const parsed = parseInput(update ? resource.schemas.update : resource.schemas.apiCreate ?? resource.schemas.create, body) as Record<string, unknown>;

  const media = contentMediaHandoff(resource.kind, parsed);

  if (media) throw new ContentError(media, 422, [{ code: "UI_HANDOFF", path: [], href: `/dm/${resource.kind}` }]);

  // Explicit deterministic title prevents an oEmbed fetch while holding the tx.
  if (resource.kind === "tracks" && !update && parsed.kind === "youtube" && parsed.title === undefined) parsed.title = `YouTube ${parseYoutubeId(String(parsed.url))}`;

  return parsed;
}

export function createContentActions(deps: Deps = {}): AssistantActionDef[] {
  const resources = deps.resources ?? CONTENT_RESOURCES;

  const snapshot = deps.snapshot ?? contentSnapshot;

  const guard = deps.guard ?? ((campaignId, callback) => withCampaignContentWrite(campaignId, callback));

  const actions: AssistantActionDef[] = [];

  for (const [kind, resource] of Object.entries(resources)) {
    if (!resource) continue;

    const base = { title: resource.label, description: resource.description };

    const target = (id: string, row?: Record<string, unknown>): TargetRef => ({ domain: kind, id, name: String(row?.name ?? row?.title ?? resource.label) });

    const found = async (caller: AssistantCaller, id: string) => {
      const row = await resource.find(caller.actor, id, "write");

      if (!row) throw new ContentError(resource.notFound, 404);

      return row as Record<string, unknown>;
    };

    actions.push({ ...base, id: `content.${kind}.get`, need: NEED.read(resource.access.item), input: z.object({ id: idSchema }), effect: "read", execute: async (caller, input) => contentResult(await getContent(resource, caller.actor, (input as { id: string }).id)) });
    actions.push({ ...base, id: `content.${kind}.list`, need: NEED.read(resource.access.list), input: querySchema, effect: "read", execute: async (caller, input) => {
      const { query, offset, limit } = querySchema.parse(input);

      const rows = await listContent(resource, caller.actor, new URLSearchParams(query));

      if (!Array.isArray(rows)) throw new ContentError("Некоректний список", 500);

      return contentResult({ total: rows.length, offset, items: rows.slice(offset, offset + limit).map((row) => ({ id: row.id, name: row.name ?? row.title, ...Object.fromEntries(resource.listFields.map((field) => [field, row[field]])) })), nextOffset: offset + limit < rows.length ? offset + limit : null });
    } });

    const createSchema = z.object({ data: resource.schemas.apiCreate ?? resource.schemas.create });

    const updateSchema = z.object({ id: idSchema, patch: resource.schemas.update });

    for (const verb of ["create", "update", "delete", ...(resource.removeAll ? ["delete-all"] as const : [])] as const) {
      const schema = verb === "create" ? createSchema : verb === "update" ? updateSchema : verb === "delete" ? z.object({ id: idSchema }) : empty;

      const action: AssistantWriteAction = {
        ...base, id: `content.${kind}.${verb}`, need: verb === "delete-all" ? NEED.writeAll : NEED.write, input: schema, effect: "write", confirmation: verb.startsWith("delete") ? "always" : "standard",
        prepare: async (caller, input) => guard(caller.actor.campaignId, async (): Promise<ActionPreview> => {
          const value = schema.parse(input) as { id?: string; data?: unknown; patch?: unknown };

          const before = value.id ? await found(caller, value.id) : null;

          const body = verb === "create" || verb === "update" ? validatedBody(resource, value.data ?? value.patch, verb === "update") : null;

          const state = await snapshot(caller.actor);

          const targets = [target(value.id ?? (verb === "create" ? "new" : "all"), before ?? body ?? undefined)];

          const changes = body ? Object.entries(body).map(([path, after]) => ({ target: targets[0], path, before: jsonContent(before?.[path]), after: jsonContent(after) })) : [{ target: targets[0], path: "$record", before: jsonContent(before ?? state), after: null }];

          const dependencies = contentDependencies(state, kind, value.id, body);

          changes.push({ target: targets[0], path: "$dependencies", before: jsonContent(dependencies), after: jsonContent(dependencies) });

          if (verb.startsWith("delete")) {
            const ids = value.id ? [value.id] : contentIds(state, kind);

            changes.push(...contentDeleteCascades(state, kind, ids));
          }

          return { summary: `${resource.label}: ${verb}`, targets, changes, warnings: verb.startsWith("delete") ? ["Буде застосовано чинні каскади та правила посилань. Зміна залежностей скасує пропозицію."] : [], effects: [{ kind: verb === "create" ? "create" : verb === "update" ? "update" : "delete", targets, description: `${resource.label}: ${verb}` }], preconditions: { snapshot: snapshotHash(state), before: snapshotHash(before), body: jsonContent(body) } };
        }),
        execute: async (ctx, input) => withContentEffects(ctx, resource.invalidates, async () => {
          const value = schema.parse(input) as { id?: string; data?: unknown; patch?: unknown };

          if (verb === "create") {
            const created = await createContent(resource, ctx.caller.actor, validatedBody(resource, value.data, false)) as Record<string, unknown>;

            return contentResult(created, [target(String(created.id), created)]);
          }

          if (verb === "update") return contentResult(await updateContent(resource, ctx.caller.actor, value.id!, validatedBody(resource, value.patch, true)), [target(value.id!)]);

          if (verb === "delete-all") return contentResult({ deleted: await removeAllContent(resource, ctx.caller.actor) }, [target("all")]);

          await removeContent(resource, ctx.caller.actor, value.id!);

          return contentResult({ ok: true }, [target(value.id!)]);
        }),
      };

      actions.push(action);
    }
  }

  if (!deps.resources) actions.push(...createContentReadActions(), ...createContentOperationActions(deps));

  return actions;
}

export const CONTENT_ACTIONS: readonly AssistantActionDef[] = createContentActions();
