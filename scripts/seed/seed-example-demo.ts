#!/usr/bin/env tsx
import type { Prisma } from '@prisma/client';

import { SRD_RULES } from '../srd/lib/rules-preset';
import { assertSeedTarget } from './seed-library-lib';

import {
    DEMO_CAMPAIGN,
    DEMO_GM_NOTES,
    DEMO_IDS,
    DEMO_SCENE_CONTENT,
} from '@/data/example-demo-content';
import { CampaignKind, CampaignVisibility } from '@/lib/constants/campaigns';
import { prisma } from '@/lib/db';
import {
    type Bundle,
    BUNDLE_TABLES,
    delegateOf,
} from '@/lib/server/templates/bundle';
import { exportCampaign } from '@/lib/server/templates/export-campaign';
import { importBundle } from '@/lib/server/templates/import-bundle';
import { templateLocaleWhere } from '@/lib/server/templates/locale-filter';
import { baselineFromBundle } from '@/lib/server/templates/sync/hash';
import { emptyMaze } from '@/lib/utils/battle/modes/maze/constants';
import { deriveClassApplication } from '@/lib/utils/characters/classes/application';
import { toGameClassData } from '@/lib/utils/characters/classes/row';
import { templateKeyWhere } from '@/lib/utils/templates/registry';

const MAPS = {
    world: '/example-demo/maps/world.jpg',
    alderwake: '/example-demo/maps/alderwake.jpg',
    grove: '/example-demo/maps/grove.jpg',
    vault: '/example-demo/maps/vault.jpg',
    battle: '/example-demo/maps/battle-bg.jpeg',
} as const;

const DEMO_UNIT_NAMES = [
    'Scout',
    'Guard Captain',
    'Priest Acolyte',
    'Treant',
    'Giant Wolf Spider',
    'Lich',
] as const;

const json = (value: unknown) => value as Prisma.InputJsonValue;

type NamedRow = { id: string; name: string; [key: string]: unknown };

const named = (rows: readonly NamedRow[], name: string, kind: string) => {
    const row = rows.find((candidate) => candidate.name === name);

    if (!row) throw new Error(`SRD template is missing ${kind} “${name}”.`);

    return row;
};

const targetId = (
    rows: readonly NamedRow[],
    idMap: ReadonlyMap<string, string>,
    name: string,
    kind: string
) => {
    const source = named(rows, name, kind);

    const id = idMap.get(source.id);

    if (!id)
        throw new Error(
            `Could not map SRD ${kind} “${name}” into the demo campaign.`
        );

    return id;
};

const picked = (id: string, picks?: Record<string, Array<{ id: string }>>) => ({
    id,
    ...(picks && { picks }),
});

function removeMissingSpellChoices(
    value: unknown,
    spellIds: ReadonlySet<string>
): unknown {
    if (Array.isArray(value))
        return value.map((item) => removeMissingSpellChoices(item, spellIds));

    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
            key,
            key === 'spells' && Array.isArray(child)
                ? child.filter(
                      (spell) =>
                          !spell ||
                          typeof spell !== 'object' ||
                          !('spellId' in spell) ||
                          typeof spell.spellId !== 'string' ||
                          spellIds.has(spell.spellId)
                  )
                : removeMissingSpellChoices(child, spellIds),
        ])
    );
}

function rangerAtLevel20(bundle: Bundle, idMap: ReadonlyMap<string, string>) {
    const ranger = named(bundle.classes as NamedRow[], 'Ranger', 'class');

    const rangerId = idMap.get(ranger.id);

    if (!rangerId)
        throw new Error(
            'Could not map the SRD Ranger class into the demo campaign.'
        );

    const abilityScoreFeatId = targetId(
        bundle.feats as NamedRow[],
        idMap,
        'Ability Score Improvement',
        'feat'
    );

    const epicBoonId = targetId(
        bundle.feats as NamedRow[],
        idMap,
        'Boon of Fate',
        'feat'
    );

    const archeryId = targetId(
        bundle.feats as NamedRow[],
        idMap,
        'Archery',
        'feat'
    );

    const rangerSpells = (
        bundle.spells as Array<NamedRow & { lists?: string[]; level?: number }>
    )
        .filter(
            (spell) =>
                spell.lists?.includes('Ranger') && (spell.level ?? 0) <= 5
        )
        .slice(0, 15);

    if (rangerSpells.length !== 15)
        throw new Error(
            `Expected 15 prepared SRD Ranger spells; found ${rangerSpells.length}.`
        );

    const asi = (score: string, secondScore?: string) =>
        picked(abilityScoreFeatId, {
            'ability-score-increase': [
                { id: score },
                ...(secondScore ? [{ id: secondScore }] : [{ id: score }]),
            ],
        });

    const choices = {
        'prepared-spells': rangerSpells.map((spell) => ({
            id: idMap.get(spell.id) ?? spell.id,
        })),
        'fighting-style-2': [picked(archeryId)],
        'ability-score-improvement-4': [asi('dexterity')],
        'hunters-prey-3': [picked('colossus-slayer')],
        'defensive-tactics-7': [picked('multiattack-defense')],
        'ability-score-improvement-8': [asi('dexterity', 'wisdom')],
        'ability-score-improvement-12': [asi('wisdom')],
        'ability-score-improvement-16': [asi('wisdom')],
        'epic-boon-19': [
            picked(epicBoonId, {
                'ability-score-increase': [{ id: 'wisdom' }],
            }),
        ],
        'deft-explorer-2': [{ id: 'perception' }],
        'expertise-9': [{ id: 'nature' }, { id: 'stealth' }],
    };

    return {
        classId: rangerId,
        level: 20,
        choices,
    };
}

async function copySrdLibraries(campaignId: string, userId: string) {
    const source = await prisma.campaign.findFirst({
        where: {
            kind: CampaignKind.TEMPLATE,
            visibility: CampaignVisibility.OFFICIAL,
            AND: [templateKeyWhere(['srd-5.2']), templateLocaleWhere()],
        },
        select: { id: true, credits: true },
    });

    if (!source) throw new Error(`Official template “srd-5.2” was not found.`);

    const sourceBundle = await exportCampaign(prisma, source.id);

    const rangerSpells = (
        sourceBundle.spells as Array<
            NamedRow & { lists?: string[]; level?: number }
        >
    )
        .filter(
            (spell) =>
                spell.lists?.includes('Ranger') && (spell.level ?? 0) <= 5
        )
        .slice(0, 15);

    if (rangerSpells.length !== 15)
        throw new Error(
            `Expected 15 prepared SRD Ranger spells; found ${rangerSpells.length}.`
        );

    const demoUnits = DEMO_UNIT_NAMES.map((name) =>
        named(sourceBundle.units as NamedRow[], name, 'unit')
    );

    const battleSpellIds = new Set(
        demoUnits.flatMap((unit) => {
            const spellcasting = unit.spellcasting as
                | { spells?: Array<{ spellId?: string }> }
                | undefined;

            return (
                spellcasting?.spells?.flatMap((spell) =>
                    spell.spellId ? [spell.spellId] : []
                ) ?? []
            );
        })
    );

    const usedSpellIds = new Set([
        ...rangerSpells.map((spell) => spell.id),
        ...battleSpellIds,
    ]);

    const demoBundle: Bundle = {
        ...sourceBundle,
        units: demoUnits as Bundle['units'],
        races: sourceBundle.races.map((race) =>
            removeMissingSpellChoices(race, usedSpellIds)
        ) as Bundle['races'],
        // Include hero spells plus the spells referenced by the six seeded battle creatures.
        spells: (sourceBundle.spells as NamedRow[]).filter((spell) =>
            usedSpellIds.has(spell.id)
        ) as Bundle['spells'],
        // The seeded hero has no inventory, so no artifacts are used in this demo.
        artifacts: [],
    };

    const campaignBundle: Bundle = {
        ...demoBundle,
        settings: {
            ...demoBundle.settings,
            maxLevel: 20,
            allowPlayerEdit: false,
        },
        rules: SRD_RULES,
    };

    return prisma.$transaction(
        async (tx) => {
            await tx.characterSkills.deleteMany({
                where: { character: { campaignId } },
            });
            await tx.character.updateMany({
                where: { campaignId },
                data: {
                    backgroundId: null,
                    classes: json([]),
                    feats: json([]),
                    knownSpells: json([]),
                    backgroundChoices: json({}),
                    backgroundFeatPicks: json({}),
                    raceChoices: json({}),
                    skillTreeProgress: json({}),
                },
            });
            await tx.campaignSourceSync.deleteMany({ where: { campaignId } });

            for (const table of [...BUNDLE_TABLES].reverse()) {
                await delegateOf(tx, table).deleteMany({
                    where: { campaignId },
                });
            }

            const imported = await importBundle(tx, campaignBundle, campaignId);

            const classEntry = rangerAtLevel20(demoBundle, imported.idMap);

            const rangerRow = await tx.gameClass.findUniqueOrThrow({
                where: { id: classEntry.classId },
            });

            const ranger = toGameClassData(rangerRow);

            const hunter = ranger.subclasses.find(
                (subclass) => subclass.name === 'Hunter'
            );

            if (!hunter)
                throw new Error(
                    'Imported SRD Ranger is missing the Hunter subclass.'
                );

            const heroEntry = { ...classEntry, subclassId: hunter.id };

            const applied = deriveClassApplication(
                {
                    rules: SRD_RULES,
                    maxLevel: 20,
                    entries: [heroEntry],
                    spellcastingAbility: 'wisdom',
                },
                { [ranger.id]: ranger }
            );

            if (!applied.ok || !applied.data)
                throw new Error(
                    'Could not derive the level-20 SRD Ranger progression.'
                );

            const soldier = targetId(
                sourceBundle.backgrounds as NamedRow[],
                imported.idMap,
                'Soldier',
                'background'
            );

            const alert = targetId(
                sourceBundle.feats as NamedRow[],
                imported.idMap,
                'Alert',
                'feat'
            );

            await tx.campaign.update({
                where: { id: campaignId },
                data: {
                    createdFromId: source.id,
                    maxLevel: 20,
                    rules: json(SRD_RULES),
                    allowPlayerEdit: false,
                    credits: [DEMO_CAMPAIGN.credits, source.credits]
                        .filter(Boolean)
                        .join('\n\n'),
                },
            });
            await tx.campaignSourceSync.create({
                data: {
                    campaignId,
                    sourceCampaignId: source.id,
                    baseline: json(
                        baselineFromBundle(campaignBundle, imported.hashes)
                    ),
                },
            });

            await tx.character.upsert({
                where: { id: DEMO_IDS.characters.scout },
                create: {
                    id: DEMO_IDS.characters.scout,
                    campaignId,
                    controlledBy: userId,
                    type: 'player',
                    name: 'Lark, trail scout',
                    class: applied.data.class,
                    subclass: applied.data.subclass,
                    classes: json([heroEntry]),
                    race: 'Human',
                    background: 'Soldier',
                    backgroundId: soldier,
                    level: 20,
                    strength: 12,
                    dexterity: 20,
                    constitution: 14,
                    intelligence: 10,
                    wisdom: 20,
                    charisma: 8,
                    armorClass: 17,
                    initiative: 5,
                    speed: 30,
                    savingThrows: json({ strength: true, dexterity: true }),
                    skills: json({
                        athletics: true,
                        intimidation: true,
                        nature: true,
                        perception: true,
                        stealth: true,
                        animalHandling: true,
                    }),
                    spellcastingAbility: 'wisdom',
                    spellSlots: json(applied.data.spellSlots),
                    knownSpells: json(
                        heroEntry.choices['prepared-spells'].map(
                            (spell) => spell.id
                        )
                    ),
                    proficiencies: json(ranger.proficiencies),
                    languages: json(['Common', 'Elvish', 'Dwarvish']),
                    feats: json([]),
                    backgroundChoices: json({
                        'ability-scores': [
                            { id: 'dexterity' },
                            { id: 'dexterity' },
                            { id: 'constitution' },
                        ],
                    }),
                    raceChoices: json({
                        skillful: [{ id: 'animalHandling' }],
                        versatile: [{ id: alert }],
                    }),
                    status: 'active',
                },
                update: {
                    campaignId,
                    controlledBy: userId,
                    type: 'player',
                    name: 'Lark, trail scout',
                    class: applied.data.class,
                    subclass: applied.data.subclass,
                    classes: json([heroEntry]),
                    race: 'Human',
                    background: 'Soldier',
                    backgroundId: soldier,
                    level: 20,
                    strength: 12,
                    dexterity: 20,
                    constitution: 14,
                    intelligence: 10,
                    wisdom: 20,
                    charisma: 8,
                    armorClass: 17,
                    initiative: 5,
                    speed: 30,
                    savingThrows: json({ strength: true, dexterity: true }),
                    skills: json({
                        athletics: true,
                        intimidation: true,
                        nature: true,
                        perception: true,
                        stealth: true,
                        animalHandling: true,
                    }),
                    spellcastingAbility: 'wisdom',
                    spellSlots: json(applied.data.spellSlots),
                    knownSpells: json(
                        heroEntry.choices['prepared-spells'].map(
                            (spell) => spell.id
                        )
                    ),
                    proficiencies: json(ranger.proficiencies),
                    languages: json(['Common', 'Elvish', 'Dwarvish']),
                    feats: json([]),
                    backgroundChoices: json({
                        'ability-scores': [
                            { id: 'dexterity' },
                            { id: 'dexterity' },
                            { id: 'constitution' },
                        ],
                    }),
                    raceChoices: json({
                        skillful: [{ id: 'animalHandling' }],
                        versatile: [{ id: alert }],
                    }),
                    status: 'active',
                },
            });

            return {
                sourceId: source.id,
                unitCount: demoBundle.units.length,
                spellCount: demoBundle.spells.length,
                artifactCount: demoBundle.artifacts.length,
                idMap: imported.idMap,
                bundle: demoBundle,
            };
        },
        { timeout: 120_000, maxWait: 10_000 }
    );
}

async function seed(userId: string) {
    const otherDemoCampaigns = await prisma.campaign.count({
        where: { kind: CampaignKind.DEMO, id: { not: DEMO_IDS.campaign } },
    });

    if (otherDemoCampaigns > 0) {
        throw new Error(
            `Found ${otherDemoCampaigns} other Demo campaign(s); refusing to delete customer data.`
        );
    }

    const fields = {
        dmUserId: userId,
        ...DEMO_CAMPAIGN,
        maxLevel: 20,
        rules: json(SRD_RULES),
        allowPlayerEdit: false,
        kind: CampaignKind.DEMO,
        visibility: 'official',
        status: 'active',
        locale: 'en',
    };

    const campaign = await prisma.campaign.upsert({
        where: { id: DEMO_IDS.campaign },
        create: {
            id: DEMO_IDS.campaign,
            inviteCode: 'EXAMPLE-DEMO-5E',
            ...fields,
        },
        update: fields,
    });

    const srd = await copySrdLibraries(campaign.id, userId);

    const unitId = (name: string) =>
        targetId(srd.bundle.units as NamedRow[], srd.idMap, name, 'unit');

    const unitParticipants = (
        rows: Array<{ name: string; side: 'ally' | 'enemy'; quantity?: number }>
    ) =>
        rows.map((row) => ({
            id: unitId(row.name),
            type: 'unit',
            side: row.side,
            ...(row.quantity && { quantity: row.quantity }),
        }));

    await prisma.$transaction(async (tx) => {
        // Demo-owned seed data is rebuilt as one transaction. Other campaign content is untouched.
        await tx.acquaintance.deleteMany({
            where: { campaignId: campaign.id },
        });
        await tx.scenarioPage.deleteMany({
            where: { campaignId: campaign.id },
        });
        await tx.slideDeck.deleteMany({ where: { campaignId: campaign.id } });
        await tx.battleScene.deleteMany({ where: { campaignId: campaign.id } });
        await tx.worldMap.deleteMany({ where: { campaignId: campaign.id } });
        await tx.campaignTrack.deleteMany({
            where: { id: DEMO_IDS.tracks.ambience },
        });
        await tx.campaignTrack.create({
            data: {
                id: DEMO_IDS.tracks.ambience,
                campaignId: campaign.id,
                title: '1 hour of Ambient Fantasy Music | Enchanted Forest',
                kind: 'youtube',
                youtubeId: 'uHD_AnjCRtc',
                url: 'https://www.youtube.com/watch?v=uHD_AnjCRtc',
                sortOrder: 0,
            },
        });

        const world = await tx.worldMap.create({
            data: {
                id: DEMO_IDS.maps.world,
                campaignId: campaign.id,
                name: 'Briarwood and Alderwake',
                imageUrl: MAPS.world,
                width: 1398,
                height: 1080,
                fogEnabled: false,
                revealRadius: 1,
            },
        });

        const points = await Promise.all([
            tx.worldMarker.create({
                data: {
                    id: DEMO_IDS.markers.village,
                    mapId: world.id,
                    kind: 'point',
                    x: 0.22,
                    y: 0.62,
                    name: 'Alderwake',
                    icon: 'home',
                    alwaysVisible: true,
                    sortOrder: 0,
                    dmNote: 'Ivo and Tamsin offer the first clues.',
                },
            }),
            tx.worldMarker.create({
                data: {
                    id: DEMO_IDS.markers.grove,
                    mapId: world.id,
                    kind: 'point',
                    x: 0.56,
                    y: 0.43,
                    name: 'Listening Grove',
                    icon: 'tree',
                    alwaysVisible: true,
                    sortOrder: 1,
                    dmNote: 'Three listening bowls guard the gate.',
                },
            }),
            tx.worldMarker.create({
                data: {
                    id: DEMO_IDS.markers.vault,
                    mapId: world.id,
                    kind: 'point',
                    x: 0.82,
                    y: 0.24,
                    name: 'Root Vault',
                    icon: 'mountain',
                    alwaysVisible: true,
                    sortOrder: 2,
                    dmNote: 'A shifting maze leads to the Warden.',
                },
            }),
        ]);

        await tx.worldMarker.createMany({
            data: [
                {
                    id: DEMO_IDS.markers.zoneNorth,
                    mapId: world.id,
                    kind: 'zone',
                    x: 0.42,
                    y: 0.2,
                    polygon: json([
                        [0.08, 0.12],
                        [0.58, 0.08],
                        [0.54, 0.34],
                        [0.12, 0.4],
                    ]),
                    name: 'Northwood',
                    color: '#52715a',
                    sortOrder: 3,
                    alwaysVisible: true,
                },
                {
                    id: DEMO_IDS.markers.zoneSouth,
                    mapId: world.id,
                    kind: 'zone',
                    x: 0.48,
                    y: 0.73,
                    polygon: json([
                        [0.1, 0.57],
                        [0.48, 0.52],
                        [0.64, 0.88],
                        [0.16, 0.91],
                    ]),
                    name: 'Silver Creek',
                    color: '#82a69a',
                    sortOrder: 4,
                    alwaysVisible: true,
                },
            ],
        });
        for (const [index, marker] of points.entries()) {
            const [name, imageUrl] = [
                ['Alderwake', MAPS.alderwake],
                ['Listening Grove', MAPS.grove],
                ['Root Vault', MAPS.vault],
            ][index] as [string, string];

            const dimensions = [
                [736, 823],
                [3000, 3256],
                [613, 792],
            ][index] as [number, number];

            await tx.worldMap.create({
                data: {
                    id: [
                        DEMO_IDS.maps.alderwake,
                        DEMO_IDS.maps.grove,
                        DEMO_IDS.maps.vault,
                    ][index],
                    campaignId: campaign.id,
                    parentMarkerId: marker.id,
                    name,
                    imageUrl,
                    width: dimensions[0],
                    height: dimensions[1],
                    fogEnabled: false,
                },
            });
        }

        // журнал подорожей для туру: прибуття, перехід і відпочинок
        const village = { mapId: world.id, x: 0.22, y: 0.62 };

        const grove = { mapId: world.id, x: 0.56, y: 0.43 };

        const hoursAgo = (hours: number) =>
            new Date(Date.now() - hours * 3_600_000);

        await tx.worldTravelLog.createMany({
            data: [
                {
                    campaignId: campaign.id,
                    mapId: world.id,
                    characterIds: [DEMO_IDS.characters.scout],
                    to: json(village),
                    toMarkerId: DEMO_IDS.markers.village,
                    rest: 'none',
                    kind: 'enter',
                    byUserId: userId,
                    createdAt: hoursAgo(6),
                },
                {
                    campaignId: campaign.id,
                    mapId: world.id,
                    characterIds: [DEMO_IDS.characters.scout],
                    from: json(village),
                    to: json(grove),
                    toMarkerId: DEMO_IDS.markers.grove,
                    rest: 'short',
                    kind: 'travel',
                    byUserId: userId,
                    createdAt: hoursAgo(3),
                },
                {
                    campaignId: campaign.id,
                    mapId: world.id,
                    characterIds: [DEMO_IDS.characters.scout],
                    from: json(grove),
                    to: json(grove),
                    toMarkerId: null,
                    rest: 'long',
                    kind: 'rest',
                    byUserId: userId,
                    createdAt: hoursAgo(1),
                },
            ],
        });

        const groveMap = {
            cols: 9,
            rows: 12,
            background: MAPS.battle,
            opacity: 0.35,
        };

        const mazeMap = {
            cols: 9,
            rows: 12,
            background: MAPS.battle,
            opacity: 0.35,
            maze: {
                ...emptyMaze('medium'),
                exit: { x: 8, y: 6 },
                walls: [
                    '3:0:e',
                    '3:1:e',
                    '3:2:e',
                    '3:3:e',
                    '6:4:e',
                    '6:5:e',
                    '6:6:e',
                    '1:8:s',
                    '2:8:s',
                    '3:8:s',
                    '5:9:e',
                    '5:10:e',
                ],
                teleports: [
                    [
                        { x: 5, y: 10 },
                        { x: 7, y: 2 },
                    ],
                ],
                fog: ['4:5', '4:6'],
                dark: false,
            },
        };

        await tx.battleScene.createMany({
            data: [
                {
                    id: DEMO_IDS.battles.grove,
                    campaignId: campaign.id,
                    name: 'Briar Warden at the Listening Grove',
                    description:
                        'A standard encounter: silence the damaged fork, defend the clearing, or calm the guardian.',
                    status: 'prepared',
                    participants: json([
                        {
                            id: DEMO_IDS.characters.scout,
                            type: 'character',
                            side: 'ally',
                        },
                        ...unitParticipants([
                            { name: 'Scout', side: 'ally' },
                            { name: 'Guard Captain', side: 'ally' },
                            { name: 'Priest Acolyte', side: 'ally' },
                            { name: 'Treant', side: 'enemy' },
                            {
                                name: 'Giant Wolf Spider',
                                side: 'enemy',
                                quantity: 2,
                            },
                        ]),
                    ]),
                    map: json(groveMap),
                    rules: json(SRD_RULES),
                },
                {
                    id: DEMO_IDS.battles.maze,
                    campaignId: campaign.id,
                    name: 'The Root Vault Labyrinth',
                    description:
                        'A maze-mode encounter with a marked exit, echo passages and two linked teleports.',
                    status: 'prepared',
                    participants: json([
                        {
                            id: DEMO_IDS.characters.scout,
                            type: 'character',
                            side: 'ally',
                        },
                        ...unitParticipants([
                            { name: 'Scout', side: 'ally' },
                            { name: 'Lich', side: 'enemy' },
                        ]),
                    ]),
                    map: json(mazeMap),
                    rules: json(SRD_RULES),
                },
            ],
        });

        const pageRows = [
            {
                id: DEMO_IDS.pages.scene,
                campaignId: campaign.id,
                kind: 'scene',
                arc: 'The Bell Beneath Briarwood',
                title: 'The Bell Beneath Briarwood',
                subtitle:
                    'A 5e adventure of listening, roots and second chances',
                status: 'ready',
                sortOrder: 0,
                content: json(DEMO_SCENE_CONTENT),
                searchText:
                    'Alderwake Ivo Tamsin listening grove three bowls Briar Warden maze Root Vault',
            },
            {
                id: DEMO_IDS.pages.notes,
                campaignId: campaign.id,
                kind: 'note',
                arc: 'The Bell Beneath Briarwood',
                title: 'GM notes · running the one-shot',
                subtitle: 'Pacing, NPC cues and alternate outcomes',
                status: 'ready',
                sortOrder: 1,
                content: json(DEMO_GM_NOTES),
                searchText: 'GM notes NPC pacing Warden outcomes',
            },
        ];

        await tx.scenarioPage.createMany({ data: pageRows });
        await tx.slideDeck.create({
            data: {
                id: DEMO_IDS.deck,
                campaignId: campaign.id,
                title: 'Listening Grove · music and map',
                scenarioPageId: DEMO_IDS.pages.scene,
                slides: json([
                    {
                        id: 'grove-slide',
                        imageUrl: MAPS.grove,
                        title: 'The listening bowls',
                        caption: 'Sound the notes: droplet, leaf, mountain.',
                        trackId: DEMO_IDS.tracks.ambience,
                    },
                    {
                        id: 'grove-puzzle',
                        imageUrl: MAPS.grove,
                        title: 'Three-tone gate',
                        kind: 'puzzle',
                        puzzle: {
                            cut: 'organic',
                            count: 12,
                            seed: 5321,
                            imageWidth: 3000,
                            imageHeight: 3256,
                        },
                        trackId: DEMO_IDS.tracks.ambience,
                    },
                ]),
            },
        });
        await tx.acquaintance.createMany({
            data: [
                {
                    id: DEMO_IDS.acquaintances.mara,
                    campaignId: campaign.id,
                    kind: 'npc',
                    name: 'Mara Venn',
                    description:
                        'A patient trail keeper who can read the old listening marks.',
                    sourcePageId: DEMO_IDS.pages.scene,
                    sourceSectionId: DEMO_IDS.sections.grove,
                },
                {
                    id: DEMO_IDS.acquaintances.ivo,
                    campaignId: campaign.id,
                    kind: 'npc',
                    name: 'Ivo Pell',
                    description:
                        'A blunt, kind bellmaker who knows the old three-note rhyme.',
                    sourcePageId: DEMO_IDS.pages.scene,
                    sourceSectionId: DEMO_IDS.sections.village,
                },
                {
                    id: DEMO_IDS.acquaintances.tamsin,
                    campaignId: campaign.id,
                    kind: 'npc',
                    name: 'Tamsin Reed',
                    description:
                        'An eager courier who saw lanterns move against the wind.',
                    sourcePageId: DEMO_IDS.pages.scene,
                    sourceSectionId: DEMO_IDS.sections.village,
                },
            ],
        });
    });

    console.info(`Seeded one shared Demo campaign: ${campaign.id}`);
}

async function main() {
    const userId = process.argv[2];

    const allowRemote = process.argv.includes('--allow-remote');

    const expectedHost = process.argv
        .find((arg) => arg.startsWith('--expected-host='))
        ?.slice('--expected-host='.length);

    if (!userId)
        throw new Error(
            'Usage: pnpm seed:example-demo <existing-user-id> [--allow-remote --expected-host=<production-db-host>]'
        );

    const host = assertSeedTarget(process.env.DATABASE_URL, allowRemote);

    if (
        allowRemote &&
        (process.env.VERCEL_ENV !== 'production' ||
            !expectedHost ||
            host !== expectedHost)
    ) {
        throw new Error(
            'Remote seeding requires Vercel production environment and an exact --expected-host match.'
        );
    }

    if (
        !(await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        }))
    )
        throw new Error(`User ${userId} does not exist`);

    console.info(`${allowRemote ? 'Production' : 'Local'} database: ${host}`);
    await seed(userId);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
