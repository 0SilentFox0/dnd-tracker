import { z } from "zod";

import { CAMPAIGN_INCLUDE, CAMPAIGN_OMIT, createCampaignForUser, createCampaignFromBundle, loadTemplateForUser } from "./create-campaign";

import "server-only";
import { saveAiSettings } from "@/lib/ai/settings";
import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { invalidateReference, ReferenceKind } from "@/lib/cache/tags";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { CampaignKind, CampaignRole, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { checklistProgress, checklistState } from "@/lib/onboarding/progress";
import { aiSettingsSchema } from "@/lib/schemas/ai";
import { createCampaignSchema, updateCampaignSchema } from "@/lib/schemas/campaigns";
import { saveAsTemplateSchema } from "@/lib/schemas/templates";
import { actionResult, requestDigest } from "@/lib/server/assistant/json";
import type { ActionResult } from "@/lib/server/assistant/types";
import { assertCan } from "@/lib/server/content/access";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit } from "@/lib/server/content/write-context";
import { readOnboardingSnapshot } from "@/lib/server/onboarding/facts";
import { type Bundle,BUNDLE_FORMAT_VERSION } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { listTemplates } from "@/lib/server/templates/list-templates";
import type { Actor } from "@/lib/utils/api/actor";
import { isPlatformAdmin } from "@/lib/utils/api/platform-admin";

export const campaignWindowSchema = z.object({ offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(50).default(20) });

function windowItems(items: unknown[], raw: unknown) {
  const { offset, limit } = parseInput(campaignWindowSchema, raw);

  return { offset, items: items.slice(offset, offset + limit), total: items.length, nextOffset: offset + limit < items.length ? offset + limit : null };
}

export async function loadCampaignMembers(campaignId: string) {
  return prisma.campaignMember.findMany({ where: { campaignId }, select: { id: true, userId: true, role: true, user: { select: { id: true, displayName: true, email: true } } }, orderBy: { joinedAt: "asc" } });
}
export const CAMPAIGN_SETTINGS_SELECT = { id: true, name: true, description: true, kind: true, visibility: true, maxLevel: true, allowPlayerEdit: true, critChoiceByDm: true, acquaintancesEnabled: true, status: true, friendlyFire: true, xpMultiplier: true, credits: true, updatedAt: true } as const;
export const campaignResult = actionResult("campaign", "Кампанія");

function safeSettings(row: Record<string, unknown>) {
  return Object.fromEntries(Object.keys(CAMPAIGN_SETTINGS_SELECT).map(key => [key, row[key]]));
}

const need = (write = true, sessionOnly = false) => ({ access: "dm" as const, scope: write ? "campaign:write" as const : "campaign:read" as const, ...(sessionOnly && { sessionOnly: true as const }) });

const DELETE_DEPENDENCIES = {
  artifactSets: { select: { id: true }, orderBy: { id: "asc" } },
  artifacts: { select: { id: true }, orderBy: { id: "asc" } },
  battles: { select: { id: true }, orderBy: { id: "asc" } },
  characters: { select: { id: true }, orderBy: { id: "asc" } },
  mainSkills: { select: { id: true }, orderBy: { id: "asc" } },
  races: { select: { id: true }, orderBy: { id: "asc" } },
  classes: { select: { id: true }, orderBy: { id: "asc" } },
  backgrounds: { select: { id: true }, orderBy: { id: "asc" } },
  feats: { select: { id: true }, orderBy: { id: "asc" } },
  scenarioPages: { select: { id: true }, orderBy: { id: "asc" } },
  skillTrees: { select: { id: true }, orderBy: { id: "asc" } },
  skills: { select: { id: true }, orderBy: { id: "asc" } },
  spellGroups: { select: { id: true }, orderBy: { id: "asc" } },
  spells: { select: { id: true }, orderBy: { id: "asc" } },
  tracks: { select: { id: true }, orderBy: { id: "asc" } },
  slideDecks: { select: { id: true }, orderBy: { id: "asc" } },
  units: { select: { id: true }, orderBy: { id: "asc" } },
  aiThreads: { select: { id: true }, orderBy: { id: "asc" } },
  aiProposals: { select: { id: true }, orderBy: { id: "asc" } },
  apiTokens: { select: { id: true }, orderBy: { id: "asc" } },
  compendiumSources: { select: { id: true }, orderBy: { id: "asc" } },
  compendiumEntries: { select: { id: true }, orderBy: { id: "asc" } },
  compendiumRuns: { select: { id: true }, orderBy: { id: "asc" } },
  inventoryLog: { select: { id: true }, orderBy: { id: "asc" } },
  characterLog: { select: { id: true }, orderBy: { id: "asc" } },
} as const;

type PreparedSource = { bundle: Bundle; id: string };

async function loadCampaignState(actor: Actor, operation: string, input: Record<string, unknown>) {
  const row = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { ...CAMPAIGN_SETTINGS_SELECT, aiInstructions: true, rules: true, ...(operation === "delete" && DELETE_DEPENDENCIES) } });

  if (!row) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

  const members = await prisma.campaignMember.findMany({ where: { campaignId: actor.campaignId }, select: { id: true, userId: true, role: true }, orderBy: { id: "asc" } });

  let sourceHash: string | null = null;

  let source: PreparedSource | null = null;

  if (["clone", "template.save"].includes(operation)) source = { bundle: await exportCampaign(prisma, actor.campaignId), id: actor.campaignId };

  if (operation === "create" && input.templateId) {
    if (String(input.templateId) !== actor.campaignId) {
      try { await prisma.$queryRaw`SELECT id FROM campaigns WHERE id = ${String(input.templateId)} FOR SHARE NOWAIT`; }
      catch { throw new ContentError(API_ERRORS.ASSISTANT_TEMPLATE_CHANGING, 409); }
    }

    const template = await loadTemplateForUser(actor.userId, String(input.templateId));

    if (!template.ok) throw new ContentError(API_ERRORS.ASSISTANT_TEMPLATE_UNAVAILABLE, template.status);

    source = { bundle: await exportCampaign(prisma, template.template.id), id: template.template.id };
  }

  if (source) sourceHash = requestDigest(source.bundle);

  const state = { settings: safeSettings(row), instructions: row.aiInstructions, rulesHash: requestDigest(row.rules ?? null), members, sourceHash, dependencies: operation === "delete" ? Object.fromEntries(Object.keys(DELETE_DEPENDENCIES).map(key => [key, (row as unknown as Record<string, unknown>)[key] ?? []])) : null };

  return { state, source };
}

export async function campaignState(actor: Actor, operation: string, input: Record<string, unknown>) {
  return (await loadCampaignState(actor, operation, input)).state;
}

export async function updateCampaignSettings(actor: Actor, raw: unknown) {
  assertCan(actor, need());

  const data = parseInput(updateCampaignSchema, raw);

  return withCampaignContentWrite(actor.campaignId, async () => {
    if (data.visibility !== undefined) {
      const row = await prisma.campaign.findUnique({ where: { id: actor.campaignId }, select: { kind: true } });

      if (actor.via !== "session" || row?.kind !== CampaignKind.TEMPLATE || !isPlatformAdmin(actor.userId)) throw new ContentError(API_ERRORS.FORBIDDEN, 403);
    }

    const updated = await prisma.campaign.update({ where: { id: actor.campaignId }, data: { ...data, ...(data.description !== undefined && { description: data.description || null }) }, include: CAMPAIGN_INCLUDE, omit: CAMPAIGN_OMIT });

    afterContentCommit(() => invalidateCampaignLists(updated.members.map(m => m.userId)));

    return updated;
  });
}
export async function removeCampaignMember(actor: Actor, memberId: string) {
  assertCan(actor, need());

  return withCampaignContentWrite(actor.campaignId, async () => {
    const member = await prisma.campaignMember.findUnique({ where: { id: memberId }, select: { campaignId: true, role: true, userId: true } });

    if (!member) throw new ContentError(API_ERRORS.NOT_FOUND, 404);

    if (member.campaignId !== actor.campaignId) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

    if (member.role === CampaignRole.DM) throw new ContentError(API_ERRORS.CANNOT_REMOVE_DM, 400);

    await prisma.campaignMember.deleteMany({ where: { id: memberId } });

    const remaining = await prisma.campaignMember.findMany({ where: { campaignId: actor.campaignId }, select: { userId: true } });

    afterContentCommit(() => invalidateCampaignLists([member.userId, ...remaining.map(m => m.userId)]));

    return { success: true };
  });
}
export async function deleteCampaign(actor: Actor) {
  assertCan(actor, need(true, true));

  return withCampaignContentWrite(actor.campaignId, async () => {
    const members = await prisma.campaignMember.findMany({ where: { campaignId: actor.campaignId }, select: { userId: true } });

    await prisma.campaign.delete({ where: { id: actor.campaignId } });
    afterContentCommit(async () => {
      await invalidateCampaignLists(members.map(m => m.userId));
      invalidateReference(Object.values(ReferenceKind), actor.campaignId);
    });

    return { success: true };
  });
}
export async function saveCampaignAsTemplate(actor: Actor, raw: unknown, prepared?: Bundle) {
  assertCan(actor, need(true, true));

  const data = parseInput(saveAsTemplateSchema, raw);

  return withCampaignContentWrite(actor.campaignId, async () => {
    const bundle = prepared ?? await exportCampaign(prisma, actor.campaignId);

    const created = await createCampaignFromBundle({ userId: actor.userId, name: data.name, description: data.description, bundle, kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.PRIVATE, createdFromId: actor.campaignId });

    afterContentCommit(() => invalidateCampaignLists([actor.userId]));

    return created;
  });
}
export async function runCampaignOperation(actor: Actor, operation: string, input: Record<string, unknown>, expected?: string): Promise<ActionResult> {
  const read = ["status", "instructions", "members", "templates", "export", "onboarding"].includes(operation);

  const sessionOnly = ["create", "clone", "delete", "template.save", "template.update"].includes(operation);

  assertCan(actor, need(!read, sessionOnly));

  if (operation === "templates") {
    const templates = await listTemplates(actor.userId);

    return campaignResult(windowItems([...templates.official.map(item => ({ ...item, group: "official" })), ...templates.mine.map(item => ({ ...item, group: "mine" }))], input), actor.campaignId);
  }

  if (operation === "onboarding") {
    const { facts, checklistFlag } = await readOnboardingSnapshot(actor.campaignId, actor.userId, true);

    const progress = checklistProgress(facts, actor.campaignId);

    return campaignResult({ role: facts.role, state: checklistState(checklistFlag ?? undefined, progress.allRequiredDone, new Date()), steps: progress.steps, requiredDone: progress.requiredDone, requiredTotal: progress.requiredTotal }, actor.campaignId);
  }

  return withCampaignContentWrite(actor.campaignId, async () => {
    const { state, source } = await loadCampaignState(actor, operation, input);

    if (expected && requestDigest(state) !== expected) throw new ContentError(API_ERRORS.ASSISTANT_CAMPAIGN_SETTINGS_CHANGED, 409);

    if (operation === "status") return campaignResult(state.settings, actor.campaignId);

    if (operation === "instructions") return campaignResult({ instructions: state.instructions }, actor.campaignId);

    if (operation === "members") return campaignResult(windowItems((await loadCampaignMembers(actor.campaignId)).map(row => ({ id: row.id, userId: row.userId, role: row.role, displayName: row.user.displayName })), input), actor.campaignId);

    if (operation === "export") {
      return campaignResult({ href: `/api/campaigns/${actor.campaignId}/export`, formatVersion: BUNDLE_FORMAT_VERSION, description: "Завантаження поточної кампанії у застосунку" }, actor.campaignId);
    }

    if (operation === "settings" || operation === "template.update") {
      if (operation === "template.update" && state.settings.kind !== CampaignKind.TEMPLATE) throw new ContentError(API_ERRORS.FORBIDDEN, 403);

      return campaignResult(safeSettings(await updateCampaignSettings(actor, input.patch)), actor.campaignId);
    }

    if (operation === "instructions.set") {
      const body = parseInput(aiSettingsSchema, input);

      return campaignResult(await saveAiSettings(actor.campaignId, body.instructions.trim() || null), actor.campaignId);
    }

    if (operation === "members.remove") return campaignResult(await removeCampaignMember(actor, String(input.memberId)), actor.campaignId);

    if (operation === "delete") return campaignResult(await deleteCampaign(actor), actor.campaignId);

    if (operation === "template.save") {
      const created = await saveCampaignAsTemplate(actor, input, source?.bundle);

      return { ...campaignResult({ id: created.campaign.id, name: created.campaign.name, href: `/campaigns/${created.campaign.id}/dm` }, created.campaign.id), warnings: created.warnings };
    }

    if (["create", "clone"].includes(operation)) {
      const creation = operation === "create" ? parseInput(createCampaignSchema, input) : undefined;

      const data = creation ?? parseInput(saveAsTemplateSchema, input);

      const created = await createCampaignForUser(actor.userId, { ...data, ...(creation && { maxLevel: creation.maxLevel, allowPlayerEdit: creation.allowPlayerEdit, critChoiceByDm: creation.critChoiceByDm }) }, { source: source ?? undefined, defer: afterContentCommit });

      if (!created.ok) throw new ContentError(API_ERRORS.ASSISTANT_TEMPLATE_UNAVAILABLE, created.status);

      return { ...campaignResult({ id: created.campaign.id, name: created.campaign.name, href: `/campaigns/${created.campaign.id}/dm` }, created.campaign.id), warnings: created.warnings };
    }

    throw new ContentError(API_ERRORS.ASSISTANT_UNKNOWN_CAMPAIGN_ACTION, 400);
  });
}
