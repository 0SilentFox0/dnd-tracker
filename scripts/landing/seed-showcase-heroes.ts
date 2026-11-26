// Adds a party (4 heroes at levels 6-8), SRD spells/artifacts, inventories and portraits to the en-srd demo campaign.
// Usage: DATABASE_URL=…/landingshots DIRECT_URL=… pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/landing/seed-showcase-heroes.ts
import type { Prisma } from '@prisma/client';

import { SRD_RULES } from '../srd/lib/rules-preset';

import '@/lib/utils/rules/systems/registry';
import iconsJson from '@/data/templates/srd-5.2/icons.json';
import { prisma } from '@/lib/db';
import { exportCampaign } from '@/lib/server/templates/export-campaign';
import { importBundle } from '@/lib/server/templates/import-bundle';
import { BUNDLE_TABLES, type Bundle } from '@/lib/server/templates/bundle';
import { deriveClassApplication } from '@/lib/utils/characters/classes/application';
import { toGameClassData } from '@/lib/utils/characters/classes/row';
import { d20RowData } from '@/scripts/shared/d20-row-data';

const CAMPAIGN = 'example-demo-5e';

const ICONS = 'https://mpvcaxsukbwzgrbvzmjj.supabase.co/storage/v1/object/public/unit-icons';

const json = (v: unknown) => v as Prisma.InputJsonValue;

type Row = { id: string; name: string; [k: string]: unknown };

interface HeroDef {
    id: string;
    name: string;
    className: string;
    subclass: string;
    level: number;
    race: string;
    raceChoices: Record<string, unknown>;
    background: string;
    abilities: [number, number, number, number, number, number];
    ac: number;
    initiative: number;
    saves: string[];
    skills: string[];
    portrait: string;
    gear: Record<string, string>;
    choices: (ctx: Ctx) => Record<string, unknown>;
    bgAbilities: string[];
}

interface Ctx {
    spell: (name: string) => { id: string };
    feat: (name: string) => string;
}

const asi = (ctx: Ctx, a: string, b = a) => ({
    id: ctx.feat('Ability Score Improvement'),
    picks: { 'ability-score-increase': [{ id: a }, { id: b }] },
});

const HEROES: HeroDef[] = [
    {
        id: 'demo-character-wizard',
        name: 'Maelis Voss, battle mage',
        className: 'Wizard',
        subclass: 'Evoker',
        level: 7,
        race: 'Elf',
        raceChoices: {},
        background: 'Sage',
        abilities: [8, 14, 14, 20, 13, 10],
        ac: 14,
        initiative: 2,
        saves: ['intelligence', 'wisdom'],
        skills: ['arcana', 'history', 'investigation', 'insight'],
        portrait: 'srd-2024_mage',
        gear: {
            weapon: 'Staff of Power',
            cloak: 'Robe of the Archmagi',
            helmet: 'Headband of Intellect',
            ring: 'Ring of Spell Storing',
            amulet: 'Amulet of the Planes',
        },
        bgAbilities: ['intelligence', 'intelligence', 'constitution'],
        choices: (ctx) => ({
            cantrips: ['Fire Bolt', 'Mage Hand', 'Ray of Frost', 'Prestidigitation'].map(ctx.spell),
            'prepared-spells': [
                'Magic Missile',
                'Shield',
                'Mage Armor',
                'Detect Magic',
                'Misty Step',
                'Scorching Ray',
                'Hold Person',
                'Fireball',
                'Counterspell',
                'Fly',
                'Ice Storm',
            ].map(ctx.spell),
            'scholar-2': [{ id: 'arcana' }],
            'ability-score-improvement-4': [asi(ctx, 'intelligence')],
        }),
    },
    {
        id: 'demo-character-cleric',
        name: 'Brother Hale, warden-priest',
        className: 'Cleric',
        subclass: 'Life Domain',
        level: 7,
        race: 'Dwarf',
        raceChoices: {},
        background: 'Acolyte',
        abilities: [14, 10, 15, 10, 20, 12],
        ac: 19,
        initiative: 0,
        saves: ['wisdom', 'charisma'],
        skills: ['insight', 'medicine', 'religion', 'persuasion'],
        portrait: 'srd-2024_priest',
        gear: {
            weapon: 'Mace of Disruption',
            armor: 'Dragon Scale Mail',
            shield: 'Spellguard Shield',
            amulet: 'Periapt of Health',
            ring: 'Ring of Protection',
        },
        bgAbilities: ['wisdom', 'wisdom', 'intelligence'],
        choices: (ctx) => ({
            'divine-order-1': [{ id: 'protector' }],
            cantrips: ['Sacred Flame', 'Guidance', 'Spare the Dying', 'Light'].map(ctx.spell),
            'prepared-spells': [
                'Bless',
                'Cure Wounds',
                'Guiding Bolt',
                'Healing Word',
                'Spiritual Weapon',
                'Lesser Restoration',
                'Aid',
                'Spirit Guardians',
                'Revivify',
                'Mass Healing Word',
                'Death Ward',
            ].map(ctx.spell),
            'ability-score-improvement-4': [asi(ctx, 'wisdom')],
            'blessed-strikes-7': [{ id: 'divine-strike' }],
        }),
    },
    {
        id: 'demo-character-fighter',
        name: 'Torga Redhelm, shield captain',
        className: 'Fighter',
        subclass: 'Champion',
        level: 8,
        race: 'Orc',
        raceChoices: {},
        background: 'Soldier',
        abilities: [20, 12, 16, 8, 12, 10],
        ac: 20,
        initiative: 1,
        saves: ['strength', 'constitution'],
        skills: ['athletics', 'intimidation', 'perception', 'survival'],
        portrait: 'srd-2024_warrior-veteran',
        gear: {
            weapon: 'Flame Tongue',
            armor: 'Dwarven Plate',
            shield: 'Animated Shield',
            boots: 'Boots of Speed',
            cloak: 'Cloak of Protection',
        },
        bgAbilities: ['strength', 'strength', 'constitution'],
        choices: (ctx) => ({
            'fighting-style-1': [{ id: ctx.feat('Defense') }],
            'weapon-mastery-1': [{ id: 'longsword' }, { id: 'greatsword' }, { id: 'handaxe' }],
            'ability-score-improvement-4': [asi(ctx, 'strength')],
            'ability-score-improvement-6': [asi(ctx, 'strength')],
            'ability-score-improvement-8': [asi(ctx, 'constitution', 'dexterity')],
        }),
    },
    {
        id: 'demo-character-rogue',
        name: 'Pip Thistle, cutpurse',
        className: 'Rogue',
        subclass: 'Thief',
        level: 6,
        race: 'Halfling',
        raceChoices: {},
        background: 'Criminal',
        abilities: [8, 20, 14, 12, 12, 14],
        ac: 16,
        initiative: 5,
        saves: ['dexterity', 'intelligence'],
        skills: ['stealth', 'sleightOfHand', 'acrobatics', 'perception', 'deception'],
        portrait: 'srd-2024_assassin',
        gear: {
            weapon: 'Dagger of Venom',
            armor: 'Glamoured Studded Leather',
            cloak: 'Cloak of Displacement',
            ring: 'Ring of Evasion',
            boots: 'Boots of Elvenkind',
        },
        bgAbilities: ['dexterity', 'dexterity', 'constitution'],
        choices: (ctx) => ({
            'expertise-1': [{ id: 'stealth' }, { id: 'sleightOfHand' }],
            'weapon-mastery-1': [{ id: 'dagger' }, { id: 'shortsword' }],
            'ability-score-improvement-4': [asi(ctx, 'dexterity')],
            'expertise-6': [{ id: 'perception' }, { id: 'acrobatics' }],
        }),
    },
];

const LARK_GEAR = {
    weapon: 'Oathbow',
    cloak: 'Cloak of Elvenkind',
    boots: 'Boots of Striding and Springing',
    amulet: 'Periapt of Wound Closure',
    ring: 'Ring of Animal Influence',
};

const LARK_ID = 'demo-character-scout';

const icons = iconsJson as { units: Record<string, string> };

async function main() {
    const owner = await prisma.character.findUniqueOrThrow({
        where: { id: LARK_ID },
        select: { controlledBy: true },
    });

    const template = {
        id: (await prisma.campaign.findUniqueOrThrow({ where: { id: CAMPAIGN }, select: { createdFromId: true } }))
            .createdFromId!,
    };

    const source = await exportCampaign(prisma, template.id);

    const wantedSpells = new Set<string>();

    const ctxProbe: Ctx = {
        spell: (name) => (wantedSpells.add(name), { id: '' }),
        feat: () => '',
    };

    for (const h of HEROES) h.choices(ctxProbe);

    const haveSpells = new Map(
        (await prisma.spell.findMany({ where: { campaignId: CAMPAIGN }, select: { id: true, name: true } })).map(
            (s) => [s.name, s.id]
        )
    );

    const gearNames = new Set([...HEROES.flatMap((h) => Object.values(h.gear)), ...Object.values(LARK_GEAR)]);

    const haveArtifacts = new Map(
        (await prisma.artifact.findMany({ where: { campaignId: CAMPAIGN }, select: { id: true, name: true } })).map(
            (s) => [s.name, s.id]
        )
    );

    const newSpells = (source.spells as Row[]).filter((s) => wantedSpells.has(s.name) && !haveSpells.has(s.name));

    const newArtifacts = (source.artifacts as Row[]).filter((a) => gearNames.has(a.name) && !haveArtifacts.has(a.name));

    const sourceSpells = source.spells as Row[];

    const spellReuse = new Map<string, string>();

    for (let grew = true; grew; ) {
        grew = false;

        const text = JSON.stringify([...newSpells, ...newArtifacts]);

        for (const sp of sourceSpells) {
            if (!text.includes(sp.id) || newSpells.some((n) => n.id === sp.id) || spellReuse.has(sp.id)) continue;

            const existing = haveSpells.get(sp.name);

            if (existing) spellReuse.set(sp.id, existing);
            else newSpells.push(sp);

            grew = true;
        }
    }

    for (const n of wantedSpells)
        if (!haveSpells.has(n) && !newSpells.some((s) => s.name === n)) throw new Error(`No SRD spell ${n}`);

    for (const n of gearNames)
        if (!haveArtifacts.has(n) && !newArtifacts.some((s) => s.name === n)) throw new Error(`No SRD artifact ${n}`);

    if (newSpells.length || newArtifacts.length) {
        const empty = Object.fromEntries(BUNDLE_TABLES.map((t) => [t.key, []]));

        const bundle = {
            ...source,
            ...empty,
            compendium: undefined,
            spells: newSpells,
            artifacts: newArtifacts,
        } as unknown as Bundle;

        const targetGroups = new Map(
            (await prisma.spellGroup.findMany({ where: { campaignId: CAMPAIGN }, select: { id: true, name: true } })).map(
                (g) => [g.name, g.id]
            )
        );

        const reuse = new Map<string, string>([
            ...spellReuse,
            ...            (source.spellGroups as Row[]).flatMap((g) => (targetGroups.has(g.name) ? [[g.id, targetGroups.get(g.name)!] as [string, string]] : []))
        ]);

        await prisma.$transaction((tx) => importBundle(tx, bundle, CAMPAIGN, undefined, { detached: true, reuse }), {
            timeout: 120_000,
        });
    }

    const spellId = new Map(
        (await prisma.spell.findMany({ where: { campaignId: CAMPAIGN }, select: { id: true, name: true } })).map(
            (s) => [s.name, s.id]
        )
    );

    const artifactId = new Map(
        (await prisma.artifact.findMany({ where: { campaignId: CAMPAIGN }, select: { id: true, name: true } })).map(
            (s) => [s.name, s.id]
        )
    );

    const featId = new Map(
        (await prisma.feat.findMany({ where: { campaignId: CAMPAIGN }, select: { id: true, name: true } })).map((s) => [
            s.name,
            s.id,
        ])
    );

    const ctx: Ctx = {
        spell: (name) => ({ id: spellId.get(name)! }),
        feat: (name) => {
            const id = featId.get(name);

            if (!id) throw new Error(`No feat ${name}`);

            return id;
        },
    };

    for (const h of HEROES) {
        const row = await prisma.gameClass.findFirstOrThrow({ where: { campaignId: CAMPAIGN, name: h.className } });

        const data = toGameClassData(row);

        const sub = data.subclasses.find((s) => s.name === h.subclass);

        if (!sub) throw new Error(`No subclass ${h.subclass}`);

        const entry = { classId: row.id, level: h.level, subclassId: sub.id, choices: h.choices(ctx) };

        const applied = deriveClassApplication(
            {
                rules: SRD_RULES,
                maxLevel: 20,
                entries: [entry],
                spellcastingAbility: data.spellcastingAbility ?? undefined,
            } as never,
            { [data.id]: data }
        );

        if (!applied.ok || !applied.data) {
            console.error(h.name, JSON.stringify(applied, null, 1).slice(0, 1500));
            throw new Error(`derive failed for ${h.name}`);
        }

        const bg = await prisma.background.findFirstOrThrow({ where: { campaignId: CAMPAIGN, name: h.background } });

        const [str, dex, con, int, wis, cha] = h.abilities;

        const caster = data.caster !== 'none';

        const prepared = (entry.choices['prepared-spells'] ?? []) as Array<{ id: string }>;

        const cantrips = (entry.choices.cantrips ?? []) as Array<{ id: string }>;

        const base = {
            campaignId: CAMPAIGN,
            controlledBy: owner.controlledBy,
            type: 'player',
            name: h.name,
            class: applied.data.class,
            subclass: applied.data.subclass,
            classes: json([entry]),
            race: h.race,
            background: h.background,
            backgroundId: bg.id,
            level: h.level,
            strength: str,
            dexterity: dex,
            constitution: con,
            intelligence: int,
            wisdom: wis,
            charisma: cha,
            armorClass: h.ac,
            initiative: h.initiative,
            speed: 30,
            avatar: icons.units[h.portrait],
            savingThrows: json(Object.fromEntries(h.saves.map((s) => [s, true]))),
            skills: json(Object.fromEntries(h.skills.map((s) => [s, true]))),
            spellcastingAbility: caster ? (data.spellcastingAbility ?? null) : null,
            spellSlots: json(applied.data.spellSlots),
            knownSpells: json([...cantrips, ...prepared].map((s) => s.id)),
            proficiencies: json(data.proficiencies),
            languages: json(['Common', 'Elvish', 'Dwarvish']),
            feats: json([]),
            backgroundChoices: json({ 'ability-scores': h.bgAbilities.map((id) => ({ id })) }),
            raceChoices: json(h.raceChoices),
            status: 'active',
        };

        await prisma.character.upsert({
            where: { id: h.id },
            create: d20RowData({ id: h.id, ...base }),
            update: d20RowData(base),
        });
        await seedInventory(h.id, h.gear);
        console.info('hero', h.id, applied.data.class, 'spells', base.knownSpells);
    }

    await prisma.character.update({ where: { id: LARK_ID }, data: { avatar: icons.units['srd-2024_scout'] } });
    await seedInventory(LARK_ID, LARK_GEAR);

    async function seedInventory(characterId: string, gear: Record<string, string>) {
        const equipped = Object.fromEntries(Object.entries(gear).map(([slot, n]) => [slot, artifactId.get(n)!]));

        const data = {
            equipped: json(equipped),
            attuned: json(Object.values(equipped).slice(0, 3)),
            gold: 180,
            silver: 0,
            copper: 0,
        };

        await prisma.characterInventory.upsert({
            where: { characterId },
            create: { characterId, ...data },
            update: data,
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
