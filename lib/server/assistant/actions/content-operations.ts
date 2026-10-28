import type { ActionPreview, AssistantActionDef, EffectDescription, TargetRef } from "../types";
import { withContentEffects } from "./content-effects";
import { contentMediaHandoff } from "./content-media";
import { operationPreview } from "./content-operation-preview";
import { contentSnapshot, jsonContent, snapshotHash } from "./content-snapshot";

import "server-only";
import { ReferenceKind } from "@/lib/cache/tags";
import { prisma } from "@/lib/db";
import { ContentError } from "@/lib/server/content/errors";
import { type ContentOperationId, contentOperationSchema, runContentOperation } from "@/lib/server/content/operation-service";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { previewSourceSelection } from "@/lib/server/templates/sync/apply";
import { pageSourceDiff } from "@/lib/server/templates/sync/page-diff";
import type { Actor } from "@/lib/utils/api/actor";
import type { SourceDiff } from "@/types/campaigns";

type Selection = { sourceId: string; items: Array<{ scope: string; key: string; name: string; status: string; before: unknown; after: unknown }>; autoAdded: unknown[]; credits: { before: string | null; after: string | null } };
type Deps = {
  snapshot?: (actor: Actor) => Promise<unknown>;
  guard?: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
  invoke?: (id: ContentOperationId, actor: Actor, input: unknown) => Promise<unknown>;
  sourcePreview?: (actor: Actor, input: unknown) => Promise<Selection>;
};

export function createContentOperationActions(deps: Deps = {}): AssistantActionDef[] {
  const invoke = deps.invoke ?? runContentOperation;

  const guard = deps.guard ?? ((id, fn) => withCampaignContentWrite(id, fn));

  const snapshot = deps.snapshot ?? contentSnapshot;

  const sourcePreview = deps.sourcePreview ?? (async (actor, input) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { createdFromId: true } });

    if (campaign?.createdFromId) {
      // The executor already holds the target. NOWAIT prevents opposite syncs
      // from deadlocking while ensuring source writes cannot race the guard.
      await prisma.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaign.createdFromId} FOR SHARE NOWAIT`;
    }

    return previewSourceSelection(prisma, actor.campaignId, CONTENT_OPERATIONS["source.apply"].body.parse(input), actor);
  });

  const actions: AssistantActionDef[] = [];

  for (const operation of Object.values(CONTENT_OPERATIONS)) {
    const schema = contentOperationSchema(operation.id);

    const base = { id: operation.id, title: operation.summary, description: operation.description, input: schema, need: operation.need };

    if (operation.id === "campaign.export") {
      // One canonical id retains the existing content:read grant. The browser
      // downloads raw bundles; tool history must never contain source notes.
      actions.push({ ...base, effect: "handoff", execute: async (caller) => ({ href: `/api/campaigns/${caller.actor.campaignId}/export`, reason: "Завантажте експорт кампанії у застосунку; його вміст не надсилається моделі." }) });
      continue;
    }

    if (operation.method === "GET") {
      actions.push({ ...base, effect: "read", execute: async (caller, raw) => {
        const input = schema.parse(raw) as Record<string, unknown>;

        const data = await invoke(operation.id, caller.actor, input);

        return { data: jsonContent(operation.id === "source.diff" ? pageSourceDiff(data as SourceDiff, Number(input.offset), Number(input.limit)) : data), affected: [], warnings: [] };
      } });
      continue;
    }

    actions.push({ ...base, effect: "write", confirmation: operation.need.sessionOnly || ["spell-groups.remove-all-spells", "skill-trees.save"].includes(operation.id) ? "always" : "standard",
      prepare: async (caller, raw) => guard(caller.actor.campaignId, async (): Promise<ActionPreview> => {
        const input = schema.parse(raw) as Record<string, unknown>;

        const body = (input as Record<string, unknown>).body;

        const target: TargetRef = { domain: "content", id: caller.actor.campaignId, name: operation.summary };

        const state = await snapshot(caller.actor);

        const warnings: string[] = [];

        let targets = [target];

        const projected = operationPreview(operation.id, input, state);

        if (projected?.targets.length) targets = projected.targets;

        let changes = projected?.changes ?? [{ target, path: "$operation", before: jsonContent(state), after: jsonContent(input) }];

        let effects: EffectDescription[] = [{ kind: "update", targets, description: operation.summary }];

        let selection: Selection | null = null;

        if (operation.id === "source.apply") {
          selection = await sourcePreview(caller.actor, body);
          targets = selection.items.map((item) => ({ domain: item.scope, id: item.key, name: item.name }));
          changes = selection.items.map((item, i) => ({ target: targets[i], path: "$record", before: jsonContent(item.before), after: jsonContent(item.after) }));
          changes.push({ target, path: "credits", before: selection.credits.before, after: selection.credits.after });
          effects = selection.items.map((item, i) => ({ kind: item.status === "deletedInSource" ? "delete" : item.scope === "skillTrees" ? "erase-progress" : "update", targets: [targets[i]], description: item.name }));

          if (!effects.length) effects = [{ kind: "update", targets: [target], description: "Позначки і attribution джерела" }];

          warnings.push("Залежності додаються автоматично; attribution оновлюється також для ignore. Матеріали ДМ ScenarioPage не синхронізуються.");
        } else if (operation.id === "content.import") {
          const parsed = CONTENT_OPERATIONS["content.import"].body.parse(body);

          if (parsed.dryRun) throw new ContentError("Для dryRun використайте content.import-preview", 400);

          for (const row of parsed.rows) {
            const handoff = contentMediaHandoff(String(input.kind), row);

            if (handoff) throw new ContentError(handoff, 422, [{ code: "UI_HANDOFF", path: [] }]);
          }

          const report = await invoke("content.import", caller.actor, { ...input, body: { ...parsed, dryRun: true } });

          changes.push({ target, path: "$dryRun", before: null, after: jsonContent(report) });
          warnings.push("Імпорт може виконатися частково: помилки й пропуски повертаються для кожного рядка.", "additionalSpells, спорядження та золото налаштовуються вручну.");

          // The report is a guard too: the same rows and resolved references
          // must validate identically at confirmation.
          return { summary: operation.summary, targets, changes, warnings, effects, preconditions: { snapshot: snapshotHash(state), input: jsonContent(input), report: jsonContent(report) } };
        } else if (operation.id === "spells.delete-by-level" || operation.id === "spell-groups.remove-all-spells") {
          effects = [{ kind: "delete", targets, description: operation.summary }];
        } else if (operation.id === "skill-trees.save") {
          effects = [{ kind: "erase-progress", targets, description: "Заміна дерева зі збереженням чинного перенесення прогресу" }];
        }

        return { summary: operation.summary, targets, changes, warnings, effects, preconditions: { snapshot: snapshotHash(state), input: jsonContent(input), selection: jsonContent(selection) } };
      }),
      execute: async (ctx, input) => withContentEffects(ctx, Object.values(ReferenceKind), async () => {
        const data = await invoke(operation.id, ctx.caller.actor, input);

        const report = data as { counts?: { error: number } };

        return { data: jsonContent(data), affected: [{ domain: "content", id: ctx.caller.actor.campaignId, name: operation.summary }], warnings: operation.id === "content.import" && report?.counts?.error ? ["Імпорт виконано частково; перевірте помилки рядків у звіті."] : [] };
      }),
    });
  }
  actions.push({ id: "content.import-preview", title: "Перевірити імпорт", description: "DryRun без запису й intent", input: contentOperationSchema("content.import"), need: CONTENT_OPERATIONS["content.import"].need, effect: "read", execute: async (caller, raw) => {
    const input = contentOperationSchema("content.import").parse(raw);

    return { data: jsonContent(await invoke("content.import", caller.actor, { ...input, body: { ...CONTENT_OPERATIONS["content.import"].body.parse(input.body), dryRun: true } })), affected: [], warnings: [] };
  } });

  return actions;
}
