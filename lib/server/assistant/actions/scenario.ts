import { z } from "zod";

import type { AssistantActionDef } from "../types";
import { LEGACY_PROPOSAL_ACTION } from "./legacy-proposal";
import { SCENARIO_EDIT_ACTION } from "./scenario-edit";

import { getTranslator } from "@/lib/i18n/translator";
import { createScenarioPageSchema, scenarioContentSchema, updateScenarioMetaSchema } from "@/lib/schemas/scenario";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { runScenarioOperation, scenarioFingerprint, scenarioState } from "@/lib/server/scenario/action-service";
import { jsonContent } from "@/lib/utils/common/json";

const id = z.string().min(1).max(40);

const page = z.object({ id });

const definitions = {
  mentions: z.object({ query: z.string().max(60).default("") }),
  list: z.object({}), get: page, search: z.object({ query: z.string().trim().min(1).max(200) }), versions: page,
  create: z.object({ data: createScenarioPageSchema }), meta: page.extend({ patch: updateScenarioMetaSchema }),
  save: page.extend({ content: scenarioContentSchema }), delete: page, restore: page.extend({ versionId: id }),
  "section.patch": page.extend({ sectionId: id, played: z.boolean().optional(), revealed: z.boolean().optional() }),
  "section.delete": page.extend({ sectionId: id }), "section.move": page.extend({ sectionId: id, direction: z.union([z.literal(-1), z.literal(1)]) }),
  "row.delete": page.extend({ sectionId: id, rowId: id }), "row.move": page.extend({ sectionId: id, rowId: id, direction: z.union([z.literal(-1), z.literal(1)]) }),
};

export const SCENARIO_ACTIONS: readonly AssistantActionDef[] = [LEGACY_PROPOSAL_ACTION, SCENARIO_EDIT_ACTION, ...Object.entries(definitions).map(([operation, input]): AssistantActionDef => {
  const read = ["list", "get", "search", "mentions", "versions"].includes(operation);

  const base = { id: `scenario.${operation}`, title: `Scenario: ${operation}`, description: "The current campaign scenario: pages, versions and rich content", input, need: { access: "dm" as const, scope: read ? "scenario:read" as const : "scenario:write" as const } };

  if (read) return { ...base, effect: "read", execute: (caller, value) => runScenarioOperation(caller.actor, operation, value as Record<string, unknown>, undefined, caller.locale) };

  return { ...base, effect: "write", confirmation: ["save", "restore", "delete", "section.delete", "row.delete"].includes(operation) ? "always" : "standard",
    prepare: (caller, raw) => withCampaignContentWrite(caller.actor.campaignId, async () => {
      const value = input.parse(raw) as Record<string, unknown>;

      const state = await scenarioState(caller.actor, value.id as string | undefined);

      const t = await getTranslator(caller.locale, "assistant");

      const target = { domain: "scenario", id: String(value.id ?? "new"), name: state.page?.title ?? t("results.newPage") };

      return { summary: t("summary.scenario", { operation }), targets: [target], changes: [{ target, path: operation, before: jsonContent(state.page ?? null), after: jsonContent(value) }], warnings: [], effects: [{ kind: operation.includes("delete") ? "delete" : operation === "section.patch" && value.played === false ? "erase-progress" : operation === "create" ? "create" : "update", targets: [target], description: operation }], preconditions: { fingerprint: scenarioFingerprint(state) } };
    }),
    execute: (ctx, value) => runScenarioOperation(ctx.caller.actor, operation, value as Record<string, unknown>, (ctx.expected as { fingerprint: string }).fingerprint, ctx.caller.locale),
  };
})];
