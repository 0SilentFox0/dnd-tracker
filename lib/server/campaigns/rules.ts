import type { Prisma } from '@prisma/client';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { prisma } from '@/lib/db';
import { findCustomConditionUsage } from '@/lib/server/campaigns/condition-usage';
import {
    assertModuleChange,
    assertValidSystem,
} from '@/lib/server/campaigns/modules';
import { assertCan } from '@/lib/server/content/access';
import { ContentError } from '@/lib/server/content/errors';
import { CONTENT_OPERATIONS } from '@/lib/server/content/operations';
import { withCampaignContentWrite } from '@/lib/server/content/write';
import {
    CUSTOM_CONDITION_KEY_RE,
    type CustomConditionKey,
} from '@/lib/utils/abilities/schema/kinds';
import type { Actor } from '@/lib/utils/api/actor';
import { isConditionUsed } from '@/lib/utils/rules/condition-usage';
import { stripPlayerHiddenRules } from '@/lib/utils/rules/player-hidden';
import type { Ruleset, RulesetPatch } from '@/lib/utils/rules/schema';
import { mergeRules, parseRules } from '@/lib/utils/rules/schema';
import { getRule } from '@/lib/utils/rules/sections';
import { composition } from '@/lib/utils/rules/systems/catalog';
import type { CampaignRulesView, ConditionUsage } from '@/types/campaigns';

async function loadStoredRules(
    campaignId: string
): Promise<{ raw: unknown; rules: Ruleset }> {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { rules: true },
    });

    if (!campaign) throw new ContentError(API_ERRORS.CAMPAIGN_NOT_FOUND, 404);

    return { raw: campaign.rules, rules: parseRules(campaign.rules) };
}

export async function loadRules(campaignId: string): Promise<Ruleset> {
    return (await loadStoredRules(campaignId)).rules;
}

type CountClient = Pick<Prisma.TransactionClient, 'character' | 'unit'>;

async function systemBoundContent(
    db: CountClient,
    campaignId: string
): Promise<{ systemLocked: boolean; hasCharacters: boolean }> {
    const [characters, units] = await Promise.all([
        db.character.count({ where: { campaignId } }),
        db.unit.count({ where: { campaignId } }),
    ]);

    return {
        systemLocked: characters + units > 0,
        hasCharacters: characters > 0,
    };
}

export async function readCampaignRules(
    actor: Actor
): Promise<CampaignRulesView> {
    assertCan(actor, CONTENT_OPERATIONS['rules.get'].need);

    const [rules, bound] = await Promise.all([
        loadRules(actor.campaignId),
        systemBoundContent(prisma, actor.campaignId),
    ]);

    return {
        ...(actor.isDM ? rules : stripPlayerHiddenRules(rules)),
        ...bound,
        composition: composition(rules.system),
    };
}

export async function updateCampaignRules(
    actor: Actor,
    patch: RulesetPatch
): Promise<CampaignRulesView> {
    assertCan(actor, CONTENT_OPERATIONS['rules.update'].need);

    return withCampaignContentWrite(actor.campaignId, async (tx) => {
        const { raw, rules: current } = await loadStoredRules(actor.campaignId);

        for (const key of patch.removeCustomConditions ?? []) {
            const condition = current.conditions.custom?.find(
                (c) => c.key === key
            );

            if (
                condition &&
                isConditionUsed(
                    await findCustomConditionUsage(
                        actor.campaignId,
                        key as CustomConditionKey,
                        tx
                    )
                )
            )
                throw new ContentError(
                    API_ERRORS.RULES_CUSTOM_CONDITION_IN_USE,
                    409,
                    undefined,
                    { name: condition.name }
                );
        }

        const bound = await systemBoundContent(tx, actor.campaignId);

        if (
            bound.systemLocked &&
            patch.system?.key &&
            patch.system.key !== current.system.key
        )
            throw new ContentError(API_ERRORS.SYSTEM_LOCKED, 409);

        const { confirm, ...rest } = patch;

        const modules =
            patch.system?.modules && [...new Set(patch.system.modules)].sort();

        const keyChanged =
            !!patch.system?.key && patch.system.key !== current.system.key;

        if (modules || keyChanged) {
            const next = {
                key: patch.system?.key ?? current.system.key,
                ...(modules && { modules }),
            };

            assertValidSystem(next);

            await assertModuleChange(
                tx,
                actor.campaignId,
                current.system,
                next,
                confirm === true
            );
        }

        const merged = mergeRules(
            current,
            modules ? { ...rest, system: { ...rest.system, modules } } : rest,
            raw
        );

        if (!merged.ok)
            throw new ContentError(
                API_ERRORS.INVALID_RULES,
                400,
                merged.issues
            );

        await prisma.campaign.update({
            where: { id: actor.campaignId },
            data: {
                rules: (merged.stored ??
                    merged.rules) as Prisma.InputJsonObject,
            },
        });

        return {
            ...merged.rules,
            ...bound,
            composition: composition(merged.rules.system),
        };
    });
}

export async function readCustomConditionUsage(
    actor: Actor,
    slug: string
): Promise<ConditionUsage> {
    assertCan(actor, CONTENT_OPERATIONS['rules.condition-usage'].need);

    const key = `custom:${slug}`;

    if (!CUSTOM_CONDITION_KEY_RE.test(key))
        throw new ContentError(API_ERRORS.INVALID_RULES, 400);

    const rules = await loadRules(actor.campaignId);

    const custom = getRule(rules, 'conditions.custom') as
        | Ruleset['conditions']['custom']
        | undefined;

    if (!custom?.some((c) => c.key === key))
        throw new ContentError(
            API_ERRORS.RULES_CUSTOM_CONDITION_NOT_FOUND,
            404
        );

    return findCustomConditionUsage(
        actor.campaignId,
        key as CustomConditionKey
    );
}
