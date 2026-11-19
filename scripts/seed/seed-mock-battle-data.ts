#!/usr/bin/env tsx
import { Prisma, PrismaClient } from '@prisma/client';

import {
    getElfSkillsData,
    getHumanSkillsData,
    MAIN_SKILLS_DATA,
    SPELLS_DATA,
} from './seed-mock-battle-data-data';

import { AttackType } from '@/lib/constants/battle';
import { CampaignRole } from '@/lib/constants/campaigns';
import { CharacterType } from '@/lib/constants/characters';
import { buildTreeJson } from '@/lib/utils/skills/progression';
import { d20RowData } from '@/scripts/shared/d20-row-data';
import { DEFAULT_CAMPAIGN_ID } from '@/scripts/shared/default-campaign';

const prisma = new PrismaClient();

const CAMPAIGN_ID = process.argv[2] || DEFAULT_CAMPAIGN_ID;

async function seedMockData() {
    console.log('🌱 Початок заповнення мок даними...');

    if (!CAMPAIGN_ID || CAMPAIGN_ID === 'YOUR_CAMPAIGN_ID') {
        console.error('❌ Помилка: Вкажіть ID кампанії як аргумент:');
        console.error(
            '   npx tsx scripts/seed/seed-mock-battle-data.ts YOUR_CAMPAIGN_ID'
        );
        process.exit(1);
    }

    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: CAMPAIGN_ID },
        });

        if (!campaign) {
            console.error(`❌ Кампанія з ID ${CAMPAIGN_ID} не знайдена!`);
            process.exit(1);
        }

        console.log(`✅ Кампанія знайдена: ${campaign.name}`);

        const existingSpell = await prisma.spell.findFirst({
            where: {
                campaignId: CAMPAIGN_ID,
                name: 'Fireball',
            },
        });

        if (existingSpell) {
            console.log('\n⚠️  Моки вже існують! Пропускаємо створення.');
            console.log(
                '   Якщо хочете перестворити - видаліть існуючі дані спочатку.'
            );
            process.exit(0);
        }

        console.log('\n📜 Створення заклинань...');

        const createdSpells = [];

        for (const spellData of SPELLS_DATA) {
            const existing = await prisma.spell.findFirst({
                where: {
                    campaignId: CAMPAIGN_ID,
                    name: spellData.name,
                },
            });

            if (existing) {
                console.log(`  ⏭️  Пропущено (вже існує): ${spellData.name}`);
                createdSpells.push(existing);
                continue;
            }

            const spell = await prisma.spell.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    name: spellData.name,
                    level: spellData.level,
                    description: spellData.description,
                    type: 'target',
                    damageType: 'damage',
                    dice: spellData.dice,
                    targeting: spellData.targeting as Prisma.InputJsonValue,
                    resolution: spellData.resolution as Prisma.InputJsonValue,
                    spellEffects:
                        spellData.spellEffects as Prisma.InputJsonValue,
                },
            });

            createdSpells.push(spell);
            console.log(`  ✅ Створено: ${spell.name}`);
        }

        console.log('\n🎯 Створення основних скілів...');

        const createdMainSkills = [];

        for (const mainSkillData of MAIN_SKILLS_DATA) {
            const existing = await prisma.mainSkill.findFirst({
                where: {
                    campaignId: CAMPAIGN_ID,
                    name: mainSkillData.name,
                },
            });

            if (existing) {
                console.log(
                    `  ⏭️  Пропущено (вже існує): ${mainSkillData.name}`
                );
                createdMainSkills.push(existing);
                continue;
            }

            const mainSkill = await prisma.mainSkill.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    ...mainSkillData,
                },
            });

            createdMainSkills.push(mainSkill);
            console.log(`  ✅ Створено: ${mainSkill.name}`);
        }

        console.log('\n👤 Створення скілів для раси Human...');

        const humanSkills = getHumanSkillsData(createdMainSkills);

        const createdHumanSkills = [];

        for (const skillData of humanSkills) {
            const existing = await prisma.skill.findFirst({
                where: {
                    campaignId: CAMPAIGN_ID,
                    name: skillData.name,
                },
            });

            if (existing) {
                console.log(`  ⏭️  Пропущено (вже існує): ${skillData.name}`);
                createdHumanSkills.push(existing);
                continue;
            }

            const skill = await prisma.skill.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    name: skillData.name,
                    description: skillData.description,
                    abilities: (skillData.abilities ??
                        []) as unknown as Prisma.InputJsonValue,
                    mainSkillId: skillData.mainSkillId,
                },
            });

            createdHumanSkills.push(skill);
            console.log(`  ✅ Створено: ${skill.name}`);
        }

        console.log('\n🧝 Створення скілів для раси Elf...');

        const elfSkills = getElfSkillsData(createdMainSkills, createdSpells);

        const createdElfSkills = [];

        for (const skillData of elfSkills) {
            const existing = await prisma.skill.findFirst({
                where: {
                    campaignId: CAMPAIGN_ID,
                    name: skillData.name,
                },
            });

            if (existing) {
                console.log(`  ⏭️  Пропущено (вже існує): ${skillData.name}`);
                createdElfSkills.push(existing);
                continue;
            }

            const skill = await prisma.skill.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    name: skillData.name,
                    description: skillData.description,
                    abilities: (skillData.abilities ??
                        []) as unknown as Prisma.InputJsonValue,
                    mainSkillId: skillData.mainSkillId,
                    spellId: skillData.spellId || null,
                },
            });

            createdElfSkills.push(skill);
            console.log(`  ✅ Створено: ${skill.name}`);
        }

        console.log('\n🏛️ Створення рас...');

        let humanRace = await prisma.race.findFirst({
            where: {
                campaignId: CAMPAIGN_ID,
                name: 'human',
            },
        });

        if (!humanRace) {
            humanRace = await prisma.race.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    name: 'human',
                    availableSkills: createdHumanSkills.map(
                        (s) => s.id
                    ) as Prisma.InputJsonValue,
                    disabledSkills: [] as Prisma.InputJsonValue,
                    abilities: [
                        {
                            id: 'race',
                            name: 'human',
                            trigger: { event: 'passive' },
                            effects: [
                                { kind: 'flag', flag: 'noNegativeMorale' },
                            ],
                        },
                    ] as Prisma.InputJsonValue,
                },
            });
            console.log(`  ✅ Створено: ${humanRace.name}`);
        } else {
            console.log(`  ⏭️  Пропущено (вже існує): ${humanRace.name}`);
        }

        let elfRace = await prisma.race.findFirst({
            where: {
                campaignId: CAMPAIGN_ID,
                name: 'elf',
            },
        });

        if (!elfRace) {
            elfRace = await prisma.race.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    name: 'elf',
                    availableSkills: createdElfSkills.map(
                        (s) => s.id
                    ) as Prisma.InputJsonValue,
                    disabledSkills: [] as Prisma.InputJsonValue,
                    abilities: [
                        {
                            id: 'race',
                            name: 'elf',
                            trigger: { event: 'passive' },
                            effects: [
                                {
                                    kind: 'flag',
                                    flag: 'advantage',
                                    attackKind: 'ranged',
                                },
                            ],
                        },
                    ] as Prisma.InputJsonValue,
                },
            });
            console.log(`  ✅ Створено: ${elfRace.name}`);
        } else {
            console.log(`  ⏭️  Пропущено (вже існує): ${elfRace.name}`);
        }

        console.log(`  ✅ Створено: ${humanRace.name}`);
        console.log(`  ✅ Створено: ${elfRace.name}`);

        console.log('\n🌳 Створення дерев скілів...');

        let humanSkillTree = await prisma.skillTree.findFirst({
            where: {
                campaignId: CAMPAIGN_ID,
                race: 'human',
            },
        });

        if (!humanSkillTree) {
            humanSkillTree = await prisma.skillTree.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    race: 'human',
                    skills: buildTreeJson({
                        race: 'human',
                        branches: [
                            {
                                id: createdMainSkills[0].id,
                                name: createdMainSkills[0].name,
                                color: createdMainSkills[0].color,
                                outer: [
                                    createdHumanSkills[0].id,
                                    createdHumanSkills[1].id,
                                ],
                            },
                            {
                                id: createdMainSkills[1].id,
                                name: createdMainSkills[1].name,
                                color: createdMainSkills[1].color,
                                outer: [createdHumanSkills[3].id],
                            },
                            {
                                id: createdMainSkills[2].id,
                                name: createdMainSkills[2].name,
                                color: createdMainSkills[2].color,
                                outer: [createdHumanSkills[2].id],
                            },
                        ],
                    }) as unknown as Prisma.InputJsonValue,
                },
            });
            console.log(`  ✅ Створено дерево для: human`);
        } else {
            console.log(`  ⏭️  Пропущено (вже існує): дерево для human`);
        }

        let elfSkillTree = await prisma.skillTree.findFirst({
            where: {
                campaignId: CAMPAIGN_ID,
                race: 'elf',
            },
        });

        if (!elfSkillTree) {
            elfSkillTree = await prisma.skillTree.create({
                data: {
                    campaignId: CAMPAIGN_ID,
                    race: 'elf',
                    skills: buildTreeJson({
                        race: 'elf',
                        branches: [
                            {
                                id: createdMainSkills[0].id,
                                name: createdMainSkills[0].name,
                                color: createdMainSkills[0].color,
                                outer: [
                                    createdElfSkills[0].id,
                                    createdElfSkills[1].id,
                                ],
                            },
                            {
                                id: createdMainSkills[1].id,
                                name: createdMainSkills[1].name,
                                color: createdMainSkills[1].color,
                                outer: [
                                    createdElfSkills[2].id,
                                    createdElfSkills[3].id,
                                ],
                            },
                        ],
                    }) as unknown as Prisma.InputJsonValue,
                },
            });
            console.log(`  ✅ Створено дерево для: elf`);
        } else {
            console.log(`  ⏭️  Пропущено (вже існує): дерево для elf`);
        }

        console.log(`  ✅ Створено дерево для: human`);
        console.log(`  ✅ Створено дерево для: elf`);

        console.log('\n👥 Створення персонажів...');

        const campaignMember = await prisma.campaignMember.findFirst({
            where: { campaignId: CAMPAIGN_ID, role: CampaignRole.DM },
        });

        if (!campaignMember) {
            console.error('❌ Не знайдено DM в кампанії!');
            process.exit(1);
        }

        const dmUserId = campaignMember.userId;

        const humanCharacters = [
            {
                name: 'Годрик Воїн',
                type: CharacterType.PLAYER,
                controlledBy: dmUserId,
                level: 5,
                class: 'Fighter',
                race: 'human',
                strength: 18,
                dexterity: 14,
                constitution: 16,
                intelligence: 10,
                wisdom: 12,
                charisma: 10,
                armorClass: 18,
                initiative: 2,
                speed: 30,
                morale: 1,
                spellSlots: {},
                knownSpells: [],
            },
            {
                name: 'Айра Маг',
                type: CharacterType.PLAYER,
                controlledBy: dmUserId,
                level: 5,
                class: 'Wizard',
                race: 'human',
                strength: 8,
                dexterity: 14,
                constitution: 12,
                intelligence: 18,
                wisdom: 14,
                charisma: 10,
                armorClass: 12,
                initiative: 2,
                speed: 30,
                morale: 0,
                spellcastingAbility: 'intelligence',
                spellSlots: {
                    '1': { max: 4, current: 4 },
                    '2': { max: 3, current: 3 },
                    '3': { max: 2, current: 2 },
                },
                knownSpells: [
                    createdSpells[0].id, // Fireball
                    createdSpells[2].id, // Magic Missile
                    createdSpells[3].id, // Cure Wounds
                ],
            },
        ];

        const elfCharacters = [
            {
                name: 'Ліра Стрілець',
                type: CharacterType.PLAYER,
                controlledBy: dmUserId,
                level: 5,
                class: 'Ranger',
                race: 'elf',
                strength: 12,
                dexterity: 18,
                constitution: 14,
                intelligence: 12,
                wisdom: 16,
                charisma: 10,
                armorClass: 16,
                initiative: 4,
                speed: 30,
                morale: 1,
                spellSlots: {
                    '1': { max: 3, current: 3 },
                    '2': { max: 2, current: 2 },
                },
                knownSpells: [createdSpells[1].id, createdSpells[3].id], // Heal, Cure Wounds
            },
            {
                name: 'Елвін Чарівник',
                type: CharacterType.PLAYER,
                controlledBy: dmUserId,
                level: 5,
                class: 'Sorcerer',
                race: 'elf',
                strength: 8,
                dexterity: 16,
                constitution: 14,
                intelligence: 12,
                wisdom: 10,
                charisma: 18,
                armorClass: 13,
                initiative: 3,
                speed: 30,
                morale: 0,
                spellcastingAbility: 'charisma',
                spellSlots: {
                    '1': { max: 4, current: 4 },
                    '2': { max: 3, current: 3 },
                    '3': { max: 2, current: 2 },
                },
                knownSpells: [
                    createdSpells[0].id, // Fireball
                    createdSpells[2].id, // Magic Missile
                    createdSpells[4].id, // Poison Spray
                ],
            },
        ];

        const allCharacters = [...humanCharacters, ...elfCharacters];

        const createdCharacters = [];

        for (const charData of allCharacters) {
            const existing = await prisma.character.findFirst({
                where: {
                    campaignId: CAMPAIGN_ID,
                    name: charData.name,
                },
            });

            if (existing) {
                console.log(
                    `  ⏭️  Пропущено (вже існує): ${charData.name} (${charData.race})`
                );
                createdCharacters.push(existing);
                continue;
            }

            const character = await prisma.character.create({
                data: d20RowData({
                    campaignId: CAMPAIGN_ID,
                    ...charData,
                    spellSlots: charData.spellSlots as Prisma.InputJsonValue,
                    knownSpells: charData.knownSpells as Prisma.InputJsonValue,
                }),
            });

            const skillTreeId =
                charData.race === 'human' ? humanSkillTree.id : elfSkillTree.id;

            let unlockedSkills: string[] = [];

            if (character.race === 'human') {
                if (character.name === 'Годрик Воїн') {
                    unlockedSkills = [
                        createdHumanSkills[0].id,
                        createdHumanSkills[2].id,
                    ];
                } else if (character.name === 'Айра Маг') {
                    unlockedSkills = [createdHumanSkills[3].id];
                }
            } else if (character.race === 'elf') {
                if (character.name === 'Ліра Стрілець') {
                    unlockedSkills = [
                        createdElfSkills[0].id,
                        createdElfSkills[1].id,
                    ];
                } else if (character.name === 'Елвін Чарівник') {
                    unlockedSkills = [
                        createdElfSkills[2].id,
                        createdElfSkills[3].id,
                    ];
                }
            }

            await prisma.skillTreeProgress.upsert({
                where: { characterId: character.id },
                create: {
                    characterId: character.id,
                    progress: {
                        [skillTreeId]: { unlockedSkills },
                    },
                    version: 1,
                },
                update: {
                    progress: {
                        [skillTreeId]: { unlockedSkills },
                    },
                    version: { increment: 1 },
                },
            });

            let equippedItems: Record<string, unknown> = {};

            if (character.class === 'Fighter') {
                equippedItems = {
                    mainHand: {
                        id: `weapon-${character.id}-sword`,
                        name: 'Меч',
                        type: 'weapon',
                        attackBonus: 7,
                        damageDice: '1d8+4',
                        damageType: 'slashing',
                        weaponType: AttackType.MELEE,
                    },
                };
            } else if (character.class === 'Ranger') {
                equippedItems = {
                    mainHand: {
                        id: `weapon-${character.id}-bow`,
                        name: 'Лук',
                        type: 'weapon',
                        attackBonus: 8,
                        damageDice: '1d8+4',
                        damageType: 'piercing',
                        weaponType: AttackType.RANGED,
                        range: '150/600',
                    },
                };
            } else {
                equippedItems = {
                    mainHand: {
                        id: `weapon-${character.id}-staff`,
                        name: 'Посох',
                        type: 'weapon',
                        attackBonus: 2,
                        damageDice: '1d6',
                        damageType: 'bludgeoning',
                        weaponType: AttackType.MELEE,
                    },
                };
            }

            await prisma.characterInventory.create({
                data: {
                    characterId: character.id,
                    equipped: equippedItems as Prisma.InputJsonValue,
                    backpack: [],
                    gold: 100,
                    silver: 0,
                    copper: 0,
                    items: [],
                },
            });

            createdCharacters.push(character);
            console.log(`  ✅ Створено: ${character.name} (${character.race})`);
        }

        console.log('\n✅ Всі моки успішно створені!');
        console.log('\n📊 Підсумок:');
        console.log(`  - Заклинань: ${createdSpells.length}`);
        console.log(`  - Основних скілів: ${createdMainSkills.length}`);
        console.log(`  - Скілів для Human: ${createdHumanSkills.length}`);
        console.log(`  - Скілів для Elf: ${createdElfSkills.length}`);
        console.log(`  - Рас: 2`);
        console.log(`  - Дерев скілів: 2`);
        console.log(`  - Персонажів: ${createdCharacters.length}`);
        console.log('\n🎮 Готово до тестування!');
    } catch (error) {
        console.error('❌ Помилка при створенні моків:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedMockData();
