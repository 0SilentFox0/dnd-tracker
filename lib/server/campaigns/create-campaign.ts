import type { Campaign, Prisma } from "@prisma/client";

import { CampaignKind, CampaignRole, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { type Bundle, TemplateLeakError } from "@/lib/server/templates/bundle";
import { importBundle } from "@/lib/server/templates/import-bundle";
import { isDmMember } from "@/lib/utils/api/is-dm";
import { generateInviteCode, INVITE_CODE_ATTEMPTS, isInviteCodeClash } from "@/lib/utils/campaigns/invite-code";
import { parseRules } from "@/lib/utils/rules/schema";

export { TemplateLeakError };

interface CreateFromBundleInput {
  userId: string;
  name: string;
  description?: string | null;
  bundle: Bundle | null;
  kind?: "campaign" | "template";
  visibility?: "private" | "official";
  createdFromId?: string | null;
  settings?: Partial<Bundle["settings"]>;
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
    ...(input.bundle && { rules: parseRules(input.bundle.rules) as Prisma.InputJsonObject }),
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

          const { warnings } = await importBundle(tx, bundle, campaign.id);

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

  if (template.visibility === CampaignVisibility.OFFICIAL || isDmMember(template.members)) {
    return { ok: true, template };
  }

  return { ok: false, status: 403 };
}
