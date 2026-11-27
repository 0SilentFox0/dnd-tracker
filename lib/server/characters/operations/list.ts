import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import {
    characterHandler,
    defineCharacterOperation,
    memberScope,
} from '../operation-runner';
import { bakedStatsFor } from './list-baked-stats';

import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    CharacterStatus,
    type CharacterStatusValue,
    CharacterType,
    type CharacterTypeValue,
} from '@/lib/constants/characters';
import { prisma } from '@/lib/db';
import { ContentError } from '@/lib/server/content/errors';
import type { Actor } from '@/lib/utils/api/actor';
import { requireCampaignAccess } from '@/lib/utils/api/api-auth';
import {
    type RuleSystemDefinition,
    ruleSystemOf,
} from '@/lib/utils/rules/systems';
import { flattenStoredColumns } from '@/lib/utils/rules/systems/column-view';
import {
    readStoredColumn,
    STORED_COLUMN,
} from '@/lib/utils/rules/systems/stored-columns';

const COMPACT_SELECT = {
    id: true,
    campaignId: true,
    type: true,
    controlledBy: true,
    name: true,
    level: true,
    class: true,
    race: true,
    avatar: true,
} as const;

const LIST_SELECT = {
    ...COMPACT_SELECT,
    subrace: true,
    constitution: true,
    archetype: true,
    classes: true,
    armorClass: true,
    initiative: true,
    experience: true,
    resources: true,
    characteristics: true,
    user: { select: { displayName: true } },
} as const;

type ListRow = LedgerRow & { id: string } & Record<string, unknown>;

type LedgerRow = { characteristics?: unknown; controlledBy?: string | null };

export const redactListedLedgers = <T extends LedgerRow>(
    rows: T[],
    viewer: { userId?: string; isDM: boolean },
    system: RuleSystemDefinition
): T[] => {
    const { redact } = system.characteristics;

    if (!redact) return rows;

    return rows.map((row) =>
        row.characteristics
            ? {
                  ...row,
                  characteristics: redact(row.characteristics, {
                      isDM: viewer.isDM,
                      isOwner:
                          !!viewer.userId && row.controlledBy === viewer.userId,
                  }),
              }
            : row
    );
};

const listSchema = z.object({
    type: z.string().nullish(),
    compact: z.boolean().optional(),
    status: z.string().nullish(),
    maxHp: z.boolean().optional(),
});

async function fetchRows({
    where,
    select,
    withBaked,
    campaignId,
}: {
    where: Prisma.CharacterWhereInput;
    select: Record<string, unknown>;
    withBaked: boolean;
    campaignId: string;
}) {
    const fetched = (await (withBaked
        ? prisma.character.findMany({
              where,
              include: { inventory: true, user: LIST_SELECT.user },
              orderBy: { createdAt: 'desc' },
          })
        : prisma.character.findMany({
              where,
              select,
              orderBy: { createdAt: 'desc' },
          }))) as unknown as ListRow[];

    if (!withBaked) return { rows: fetched, baked: null };

    return {
        rows: fetched.map(
            (row) =>
                Object.fromEntries(
                    Object.keys(select).map((k) => [k, row[k]])
                ) as ListRow
        ),
        baked: await bakedStatsFor(campaignId, fetched as never),
    };
}

export const listOperation = defineCharacterOperation({
    name: 'list',
    action: 'list characters',
    schema: listSchema,
    unlocked: true,
    gate: memberScope,
    query: ({ searchParams }) => ({
        type: searchParams.get('type'),
        compact:
            searchParams.get('compact') === '1' ||
            searchParams.get('compact') === 'true',
        status: searchParams.get('status'),
        maxHp: searchParams.get('maxHp') === '1',
    }),
    run: async ({ access, campaignId }, { type, compact, status, maxHp }) => {
        const pending = status === CharacterStatus.PENDING;

        if (pending && !access.isDM)
            throw new ContentError(API_ERRORS.FORBIDDEN, 403);

        const where: {
            campaignId: string;
            status: CharacterStatusValue;
            type?: CharacterTypeValue;
        } = {
            campaignId,
            status: pending ? CharacterStatus.PENDING : CharacterStatus.ACTIVE,
        };

        if (type === CharacterType.PLAYER || type === CharacterType.NPC_HERO)
            where.type = type;

        const orderBy = { createdAt: 'desc' } as const;

        if (compact)
            return prisma.character.findMany({
                where,
                select: COMPACT_SELECT,
                orderBy,
            });

        const token = ruleSystemOf(access.campaign.rules).combat.rerollToken;

        const { rows, baked } = await fetchRows({
            where,
            select: pending
                ? { ...LIST_SELECT, reviewNote: true }
                : LIST_SELECT,
            withBaked: !!maxHp && (access.isDM || !!access.isDemo) && !pending,
            campaignId,
        });

        return redactListedLedgers(
            rows.map((row) => ({
                ...row,
                ...(token && {
                    inspiration:
                        readStoredColumn(
                            access.campaign.rules,
                            row,
                            STORED_COLUMN.inspiration,
                            'boolean'
                        ) ?? false,
                }),
            })),
            access,
            ruleSystemOf(access.campaign.rules)
        )
            .map(flattenStoredColumns)
            .map((row) => ({
                ...row,
                ...(baked?.has(row.id) && baked.get(row.id)),
            }));
    },
});

const list = characterHandler(listOperation);

export async function listCharacters(
    request: Request,
    campaignId: string,
    actor?: Actor
) {
    if (actor) return list(request, campaignId, undefined, actor);

    const access = await requireCampaignAccess(campaignId, false, {
        allowDemo: true,
    });

    if (access instanceof NextResponse) return access;

    if (!access.isDemo) return list(request, campaignId);

    const search = new URL(request.url).searchParams;

    const type = search.get('type');

    const compact =
        search.get('compact') === '1' || search.get('compact') === 'true';

    const { rows, baked } = await fetchRows({
        where: {
            campaignId,
            status: CharacterStatus.ACTIVE,
            ...(type === CharacterType.PLAYER || type === CharacterType.NPC_HERO
                ? { type }
                : {}),
        },
        select: compact ? COMPACT_SELECT : LIST_SELECT,
        withBaked: search.get('maxHp') === '1' && !compact,
        campaignId,
    });

    return NextResponse.json(
        compact
            ? rows
            : redactListedLedgers(
                  rows,
                  access,
                  ruleSystemOf(access.campaign.rules)
              ).map((row) => ({
                  ...row,
                  ...(baked?.has(row.id) && baked.get(row.id)),
              }))
    );
}
