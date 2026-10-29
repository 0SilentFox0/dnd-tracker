import { z } from "zod";

import type { AssistantActionDef } from "../types";

import "server-only";
import { getTranslator } from "@/lib/i18n/translator";
import { aiSettingsSchema } from "@/lib/schemas/ai";
import { createCampaignSchema, updateCampaignSchema } from "@/lib/schemas/campaigns";
import { saveAsTemplateSchema } from "@/lib/schemas/templates";
import { campaignState, campaignWindowSchema, runCampaignOperation } from "@/lib/server/campaigns/action-service";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { requestDigest } from "@/lib/utils/battle/store/stable-json";
import { jsonContent } from "@/lib/utils/common/json";

const empty = z.object({});

const definitions = {
  status: empty, instructions: empty, members: campaignWindowSchema, templates: campaignWindowSchema, onboarding: empty,
  settings: z.object({ patch: updateCampaignSchema.omit({ visibility: true }).strict() }),
  "instructions.set": aiSettingsSchema, "members.remove": z.object({ memberId: z.string().min(1).max(100) }),
  create: createCampaignSchema, clone: saveAsTemplateSchema, "template.save": saveAsTemplateSchema,
  "template.update": z.object({ patch: updateCampaignSchema }), delete: empty,
};

export const CAMPAIGN_ACTIONS: readonly AssistantActionDef[] = Object.entries(definitions).map(([operation, input]): AssistantActionDef => {
  const read = ["status", "instructions", "members", "templates", "export", "onboarding"].includes(operation);

  const sessionOnly = ["create", "clone", "delete", "template.save", "template.update"].includes(operation);

  const base = { id: `campaign.${operation}`, title: `Campaign: ${operation}`, description: "The current campaign and the available templates", input, need: { access: "dm" as const, scope: read ? "campaign:read" as const : "campaign:write" as const, ...(sessionOnly && { sessionOnly: true as const }) } };

  if (read) return { ...base, effect: "read", execute: (caller, raw) => runCampaignOperation(caller.actor, operation, input.parse(raw) as Record<string, unknown>, undefined, caller.locale) };

  return { ...base, effect: "write", confirmation: ["delete", "members.remove", "template.update"].includes(operation) ? "always" : "standard",
    prepare: (caller, raw) => withCampaignContentWrite(caller.actor.campaignId, async () => {
      const value = input.parse(raw) as Record<string, unknown>;

      const state = await campaignState(caller.actor, operation, value);

      const target = { domain: "campaign", id: caller.actor.campaignId, name: String(state.settings.name) };

      const t = await getTranslator(caller.locale, "assistant");

      return { summary: t("summary.campaign", { operation }), targets: [target], changes: [{ target, path: operation, before: jsonContent(state), after: jsonContent(value) }], warnings: operation === "delete" ? [t("warnings.campaignDelete")] : [], preconditions: { fingerprint: requestDigest(state) }, effects: [{ kind: operation === "delete" ? "delete" : operation === "members.remove" ? "change-access" : ["create", "clone", "template.save"].includes(operation) ? "create" : "update", targets: [target], description: operation }] };
    }),
    execute: (ctx, raw) => runCampaignOperation(ctx.caller.actor, operation, input.parse(raw) as Record<string, unknown>, (ctx.expected as { fingerprint: string }).fingerprint, ctx.caller.locale),
  };
});
