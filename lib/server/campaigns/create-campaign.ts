import type { Campaign, Prisma } from "@prisma/client";

import { invalidateCampaignLists } from "@/lib/cache/campaign-list";
import { CampaignKind, CampaignRole, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { type Bundle, TemplateLeakError } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { importBundle } from "@/lib/server/templates/import-bundle";
import { baselineFromBundle } from "@/lib/server/templates/sync/hash";
import { PUBLIC_USER_SELECT } from "@/lib/server/users/db-user";
import { canReadSource } from "@/lib/utils/api/is-dm";
import { generateInviteCode, INVITE_CODE_ATTEMPTS, isInviteCodeClash } from "@/lib/utils/campaigns/invite-code";
import { localizedDefaultAttacks } from "@/lib/utils/rules/defaults";
import { parseRules, type Ruleset } from "@/lib/utils/rules/schema";

export { TemplateLeakError };

export const CAMPAIGN_INCLUDE = { members: { include: { user: { select: PUBLIC_USER_SELECT } } }, dm: { select: PUBLIC_USER_SELECT } } as const;
export const CAMPAIGN_OMIT = { aiInstructions: true } as const;

interface CreateFromBundleInput {
  userId: string;
  name: string;
  description?: string | null;
  bundle: Bundle | null;
  kind?: "campaign" | "template";
  visibility?: "private" | "official";
  createdFromId?: string | null;
  settings?: Partial<Bundle["settings"]>;
  critChoiceByDm?: boolean;
  defaultAttacks?: Ruleset["defaultAttacks"];
}

const defined = <T extends object>(obj: T) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

function campaignData(input: CreateFromBundleInput): Prisma.CampaignCreateInput | Prisma.CampaignUncheckedCreateInput {
  const s = { ...input.bundle?.settings, ...defined(input.settings ?? {}) };

  return {
    name: input.name,
    description: input.description ?? null,
    inviteCode: generateInviteCode(),
    dmUserId: input.userId,
    kind: input.kind ?? CampaignKind.CAMPAIGN,
    visibility: input.visibility ?? CampaignVisibility.PRIVATE,
    createdFromId: input.createdFromId ?? null,
    ...(s.maxLevel !== undefined && { maxLevel: s.maxLevel }),
    ...(s.xpMultiplier !== undefined && { xpMultiplier: s.xpMultiplier }),
    ...(s.allowPlayerEdit !== undefined && { allowPlayerEdit: s.allowPlayerEdit }),
    ...(s.friendlyFire !== undefined && { friendlyFire: s.friendlyFire }),
    ...(input.critChoiceByDm !== undefined && { critChoiceByDm: input.critChoiceByDm }),
    ...((input.bundle || input.defaultAttacks) && { rules: parseRules({ ...(input.defaultAttacks && { defaultAttacks: input.defaultAttacks }), ...(input.bundle?.rules as object | undefined) }) as Prisma.InputJsonObject }),
    ...(input.bundle?.credits !== undefined && { credits: input.bundle.credits }),
    members: { create: { userId: input.userId, role: CampaignRole.DM } },
  } as Prisma.CampaignUncheckedCreateInput;
}

export async function createCampaignFromBundle(input: CreateFromBundleInput): Promise<{ campaign: Omit<Campaign, "aiInstructions">; warnings: string[] }> {
  for (let attempt = 1; ; attempt++) {
    try {
      const { bundle } = input;

      if (!bundle) {
        const campaign = await prisma.campaign.create({ data: campaignData(input), include: { members: true }, omit: { aiInstructions: true } });

        return { campaign, warnings: [] };
      }

      return await prisma.$transaction(
        async (tx) => {
          const campaign = await tx.campaign.create({ data: campaignData(input), include: { members: true }, omit: { aiInstructions: true } });

          const { warnings, hashes } = await importBundle(tx, bundle, campaign.id);

          if (input.createdFromId) {
            await tx.campaignSourceSync.create({
              data: {
                campaignId: campaign.id,
                sourceCampaignId: input.createdFromId,
                baseline: baselineFromBundle(bundle, hashes) as Prisma.InputJsonObject,
              },
            });
          }

          return { campaign, warnings };
        },
        { timeout: 60_000, maxWait: 10_000 },
      );
    } catch (error) {
      if (attempt >= INVITE_CODE_ATTEMPTS || !isInviteCodeClash(error)) throw error;
    }
  }
}

export async function loadTemplateForUser(
  userId: string,
  templateId: string,
): Promise<{ ok: true; template: Campaign } | { ok: false; status: 403 | 404 }> {
  const template = await prisma.campaign.findUnique({
    where: { id: templateId },
    include: { members: { where: { userId } } },
  });

  if (!template || template.kind !== CampaignKind.TEMPLATE) return { ok: false, status: 404 };

  return canReadSource(template.visibility, template.members) ? { ok: true, template } : { ok: false, status: 403 };
}

type CreateCampaignData = { name: string; description?: string | null; templateId?: string; maxLevel?: number; allowPlayerEdit?: boolean; critChoiceByDm?: boolean };

type CampaignSource = { bundle: Bundle; id: string };

export async function createCampaignForUser(userId: string, data: CreateCampaignData, options: { source?: CampaignSource; defer?: (effect: () => Promise<void>) => void; locale?: Locale } = {}) {
  let source = options.source ?? null;

  if (!source && data.templateId) {
    const loaded = await loadTemplateForUser(userId, data.templateId);

    if (!loaded.ok) return loaded;

    source = { bundle: await exportCampaign(prisma, loaded.template.id), id: loaded.template.id };
  }

  const created = await createCampaignFromBundle({
    userId,
    name: data.name,
    description: data.description,
    bundle: source?.bundle ?? null,
    createdFromId: source?.id ?? null,
    settings: { maxLevel: data.maxLevel, allowPlayerEdit: data.allowPlayerEdit },
    critChoiceByDm: data.critChoiceByDm,
    defaultAttacks: localizedDefaultAttacks(await getTranslator(options.locale ?? DEFAULT_LOCALE, "rules")),
  });

  const invalidate = () => invalidateCampaignLists([userId]);

  if (options.defer) options.defer(invalidate);
  else await invalidate();

  return { ok: true as const, ...created };
}
