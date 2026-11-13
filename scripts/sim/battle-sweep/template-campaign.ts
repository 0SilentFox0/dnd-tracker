import { randomUUID } from 'node:crypto';

import type { SweepProfile } from './profiles';
import type { RowCounts } from './row-counts';
import {
    dropRestoreFile,
    keptRunNotice,
    recoverRules,
    saveRestoreFile,
} from './rules-restore';
import { heroRowData, heroSpecsFor } from './seed-template-heroes';

import { prisma } from '@/lib/db';
import { mergeRules, parseRules } from '@/lib/utils/rules/schema';
import { importPack } from '@/scripts/templates/lib/import-pack';

export interface TemplateRun {
    campaign: any;
    heroIds: string[];
    cleanup: () => Promise<void>;
}

async function importTemporaryTemplate(key: string) {
    const userId = `sweep-${randomUUID()}`;

    await prisma.user.create({
        data: {
            id: userId,
            email: `${userId}@example.invalid`,
            displayName: userId,
        },
    });

    const result = await importPack(key, { owner: userId, publish: false });

    const cleanup = async () => {
        const ids = (
            await prisma.campaign.findMany({
                where: { dmUserId: userId },
                select: { id: true },
            })
        ).map((c) => c.id);

        await prisma.campaign.updateMany({
            where: { id: { in: ids } },
            data: { baseSourceId: null },
        });
        for (const model of [
            'featBase',
            'spellBase',
            'artifactBase',
            'careerBase',
            'raceBase',
            'unitBase',
        ] as const)
            await (prisma as any)[model].deleteMany({
                where: { sourceCampaignId: { in: ids } },
            });
        await prisma.campaign.deleteMany({ where: { id: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: userId } });
    };

    return {
        campaign: await prisma.campaign.findUniqueOrThrow({
            where: { id: result.templateId as string },
        }),
        cleanup,
    };
}

async function recoverLeftoverRules(): Promise<void> {
    const restored = await recoverRules(async ({ campaignId, raw }) => {
        await prisma.campaign.updateMany({
            where: { id: campaignId },
            data: { rules: raw as any },
        });
    });

    if (restored.length)
        console.info(
            `restored rules left by an interrupted sweep: ${restored.join(', ')}`
        );
}

export async function openTemplateRun(
    profile: SweepProfile,
    campaignId: string | undefined,
    keep = false
): Promise<TemplateRun> {
    await recoverLeftoverRules();

    if (profile.source.kind !== 'template')
        throw new Error(`${profile.key} runs on an existing campaign`);

    const templateKey = profile.template ?? profile.key;

    let campaign: any = campaignId
        ? await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } })
        : await prisma.campaign.findFirst({
              where: { kind: 'template', templateKey },
          });

    let dropTemplate = async () => {};

    let importedTemplate = false;

    if (!campaign) {
        if (!profile.source.importIfMissing)
            throw new Error(
                `template campaign "${templateKey}" is missing in this database`
            );

        const imported = await importTemporaryTemplate(templateKey);

        campaign = imported.campaign;
        dropTemplate = imported.cleanup;
        importedTemplate = true;
    }

    let restoreRules = async () => {};

    const dropAll = async () => {
        await restoreRules();
        await dropTemplate();
    };

    try {
        restoreRules = await patchRules(profile, campaign);

        return await seedHeroes(
            profile,
            campaign,
            dropAll,
            keep,
            importedTemplate
        );
    } catch (e) {
        await dropAll();
        throw e;
    }
}

/** writes the profile's rules over the campaign for the run; the returned restore puts the raw stored JSON back */
async function patchRules(
    profile: SweepProfile,
    campaign: any
): Promise<() => Promise<void>> {
    if (!profile.rules) return async () => {};

    const raw = campaign.rules;

    const merged = mergeRules(
        parseRules(raw),
        profile.rules.patch as Parameters<typeof mergeRules>[1],
        raw
    );

    if (!merged.ok)
        throw new Error(
            `rules patch for ${profile.key} is invalid: ${JSON.stringify(merged.issues)}`
        );

    const stored = merged.stored as Record<string, unknown>;

    const next = {
        ...stored,
        system: {
            ...(stored.system as object),
            modules: [...profile.rules.modules],
        },
    };

    const modules = parseRules(next).system.modules ?? [];

    if (profile.rules.modules.some((m) => !modules.includes(m)))
        throw new Error(
            `modules ${profile.rules.modules.join(',')} are not valid for the ${campaign.templateKey ?? profile.key} base system`
        );

    saveRestoreFile(campaign.id, raw);
    await prisma.campaign.update({
        where: { id: campaign.id },
        data: { rules: next as any },
    });
    campaign.rules = next;

    return async () => {
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { rules: raw },
        });
        dropRestoreFile(campaign.id);
    };
}

async function seedHeroes(
    profile: SweepProfile,
    campaign: any,
    dropAll: () => Promise<void>,
    keep: boolean,
    importedTemplate: boolean
): Promise<TemplateRun> {
    const races = await prisma.race.findMany({
        where: { campaignId: campaign.id },
        orderBy: { name: 'asc' },
    });

    const classes = (
        await prisma.gameClass.findMany({
            where: { campaignId: campaign.id },
            orderBy: { name: 'asc' },
        })
    ).sort((x, y) => Number(y.caster !== 'none') - Number(x.caster !== 'none'));

    const spells = await prisma.spell.findMany({
        where: { campaignId: campaign.id },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        select: { id: true, level: true, concentration: true },
    });

    const picked = [
        ...spells.filter((s) => s.concentration && s.level >= 1).slice(0, 8),
        ...spells
            .filter(
                (s) =>
                    !s.concentration &&
                    s.level <= Math.ceil(profile.heroLevel / 2)
            )
            .slice(0, 8),
    ];

    const heroIds: string[] = [];

    const artifacts = await prisma.artifact.findMany({
        where: { campaignId: campaign.id },
        select: { id: true, slot: true, systemStats: true },
    });

    const ammoWeapon = artifacts.find(
        (a) => (a.systemStats as { ammoCapacity?: number } | null)?.ammoCapacity
    );

    for (const [i, spec] of heroSpecsFor(
        races,
        classes,
        profile.heroCount,
        profile.heroMorale
    ).entries()) {
        const data = heroRowData(spec, profile, {
            campaignId: campaign.id,
            controlledBy: campaign.dmUserId,
            spellIds: picked.map((s) => s.id),
        });

        const row = await prisma.character.create({
            data: {
                ...data,
                ...(i === 0 &&
                    ammoWeapon && {
                        inventory: {
                            create: { equipped: { weapon: ammoWeapon.id } },
                        },
                    }),
            } as any,
        });

        heroIds.push(row.id);
    }

    const cleanup = async () => {
        if (keep) {
            console.info(keptRunNotice(campaign, heroIds, importedTemplate));

            return;
        }

        await prisma.battleScene.deleteMany({
            where: { campaignId: campaign.id, name: { startsWith: 'ТЕСТ' } },
        });
        await prisma.character.deleteMany({ where: { id: { in: heroIds } } });
        await dropAll();
    };

    return { campaign, heroIds, cleanup };
}

export async function snapshotRowCounts(): Promise<RowCounts> {
    const tables = await prisma.$queryRaw<
        Array<{ table_name: string }>
    >`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`;

    const out: RowCounts = {};

    for (const { table_name } of tables)
        out[table_name] = Number(
            (
                await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
                    `select count(*) as n from "${table_name}"`
                )
            )[0].n
        );

    return out;
}
