import type { Row, WfrpData } from './common';
import {
    GRIM_CORE_SLOTS,
    GRIM_WEAPON_GROUPS,
    IMPLEMENTED_QUALITIES,
    itemStatsOf,
} from './equipment';
import {
    GRIM_CORE_SPELL_LISTS,
    GRIM_SPELL_KINDS,
    spellMagicOf,
} from './spells';
import {
    GRIM_UNIT_LEVELS,
    GRIM_UNIT_THEMES,
    unitTraitKeys,
    unitTraits,
} from './units';

import {
    CAREER_TIER_COUNT,
    careerTierKey,
} from '@/lib/constants/import-aliases';
import {
    coerceRecord,
    IMPORT_SPECS,
    nameKey,
} from '@/lib/utils/content/import';
import { mergeRules } from '@/lib/utils/rules/schema';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';
import { parseStatus } from '@/systems/wfrp/rules/downtime/status';
import { ARMOUR_KINDS, QUALITY_REGISTRY } from '@/systems/wfrp/rules/equipment';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { TRAIT_RECIPES } from '@/systems/wfrp/rules/traits/recipes';

// Canon-only gear qualities the fixed Grim roster does not carry; the roster is locked by the grim-d100 plan
const GRIM_UNCARRIED = new Set([
    'penetrating',
    'accurate',
    'blackpowder',
    'defensive',
    'parry',
    'entangle',
    'wrap',
    'inflict',
    'unreliable',
    'unbalanced',
    'bulky',
    'lightweight',
    'practical',
]);

type Part = 'characteristics' | 'skills' | 'talents';

const TIERS = Array.from({ length: CAREER_TIER_COUNT }, (_, i) => i + 1);

const nameOf = (row: Row) =>
    typeof row.name === 'string' ? row.name.trim() : '';

const read = (row: Row): Row =>
    coerceRecord(row, IMPORT_SPECS.careers.fields).value;

function list(record: Row, n: number, part: Part): string[] {
    const raw = record[careerTierKey(n, part)];

    return Array.isArray(raw) ? raw.map(String) : [];
}

const RANK = { brass: 0, silver: 1, gold: 2 } as const;

function statusRank(record: Row, n: number): number | null {
    const raw = record[careerTierKey(n, 'status')];

    if (typeof raw !== 'string' || raw.trim() === '') return null;

    const { tier, level } = parseStatus(raw);

    return RANK[tier] * 100 + level;
}

const OPTIONAL_TRAITS: readonly string[] = ['frenzy', 'hatred', 'animosity'];

export const UNIT_TRAIT_COVERAGE: readonly string[] = [
    ...TRAIT_RECIPES.map((r) => r.id).filter(
        (id) => !OPTIONAL_TRAITS.includes(id)
    ),
    'terror',
    'magical',
];

const themeOf = (u: Row) =>
    (u.statblock as { creatureType?: unknown } | undefined)?.creatureType;

function unitCoverage(units: Row[]): string[] {
    if (units.length === 0) return [];

    const warnings: string[] = [];

    for (const theme of GRIM_UNIT_THEMES)
        if (!units.some((u) => themeOf(u) === theme))
            warnings.push(`units: theme "${theme}" has no unit`);

    for (const level of GRIM_UNIT_LEVELS)
        if (!units.some((u) => u.level === level))
            warnings.push(`units: level ${level} has no unit`);

    const used = new Set(units.flatMap(unitTraitKeys));

    for (const key of UNIT_TRAIT_COVERAGE)
        if (!used.has(key))
            warnings.push(`units: trait "${key}" is used by no unit`);

    for (const u of units) {
        const keys = unitTraitKeys(u);

        if (unitTraits(u).attacks.length === 0)
            warnings.push(`units "${nameOf(u)}": no attack`);

        if (keys.includes('terror') && Number(u.level) < 3)
            warnings.push(`units "${nameOf(u)}": Terror below Elite`);

        if (
            u.level === 4 &&
            !keys.includes('breath') &&
            !keys.includes('magical')
        )
            warnings.push(
                `units "${nameOf(u)}": Boss without Magical or Breath`
            );
    }

    const mean = (g: Row[]) =>
        g.reduce((sum, u) => sum + Number(u.maxHp), 0) / g.length;

    const apMax = (g: Row[]) => Math.max(...g.map((u) => unitTraits(u).ap));

    for (const theme of GRIM_UNIT_THEMES) {
        const groups = GRIM_UNIT_LEVELS.map((level) =>
            units.filter((u) => themeOf(u) === theme && u.level === level)
        ).filter((g) => g.length > 0);

        if (groups.some((g, i) => i > 0 && mean(g) <= mean(groups[i - 1])))
            warnings.push(
                `units: theme "${theme}" Wounds do not rise with level`
            );

        if (groups.some((g, i) => i > 0 && apMax(g) < apMax(groups[i - 1])))
            warnings.push(`units: theme "${theme}" Armour drops with level`);
    }

    return warnings;
}

export const CASTER_THEMES = ['Cultists', 'Horrors'] as const;

const knownSpellsOf = (u: Row): string[] =>
    Array.isArray(u.knownSpells) ? u.knownSpells.map(String) : [];

function spellCoverage(spells: Row[], units: Row[]): string[] {
    if (spells.length === 0) return [];

    const warnings: string[] = [];

    const kinds = new Set(spells.map((s) => spellMagicOf(s)?.kind));

    for (const kind of GRIM_SPELL_KINDS)
        if (!kinds.has(kind))
            warnings.push(`spells: kind "${kind}" has no spell`);

    const lists = new Set(
        spells.flatMap((s) =>
            Array.isArray(s.lists) ? s.lists.map(String) : []
        )
    );

    for (const list of new Set(Object.values(GRIM_CORE_SPELL_LISTS).flat()))
        if (!lists.has(list))
            warnings.push(`spells: list "${list}" has no spell`);

    if (units.length > 0)
        for (const theme of CASTER_THEMES)
            if (
                !units.some(
                    (u) => themeOf(u) === theme && knownSpellsOf(u).length > 0
                )
            )
                warnings.push(`units: theme "${theme}" has no caster`);

    return warnings;
}

function equipmentCoverage(artifacts: Row[]): string[] {
    if (artifacts.length === 0) return [];

    const warnings: string[] = [];

    const stats = artifacts.map(itemStatsOf);

    const groups = new Set(
        stats.map((st) => (st?.type === 'weapon' ? st.group : undefined))
    );

    for (const group of GRIM_WEAPON_GROUPS)
        if (!groups.has(group))
            warnings.push(`artifacts: weapon group "${group}" has no item`);

    const kinds = new Set(
        stats.map((st) => (st?.type === 'armour' ? st.kind : undefined))
    );

    for (const kind of ARMOUR_KINDS)
        if (!kinds.has(kind))
            warnings.push(`artifacts: armour kind "${kind}" has no item`);

    const slots = new Set(artifacts.map((a) => a.slot));

    for (const slot of GRIM_CORE_SLOTS)
        if (
            slot !== 'weapon' &&
            slot !== 'range_weapon' &&
            slot !== 'item' &&
            !slots.has(slot)
        )
            warnings.push(`artifacts: slot "${slot}" has no item`);

    const carried = new Set(
        stats.flatMap((st) =>
            [
                ...(st?.qualities ?? []),
                ...(st && 'flaws' in st ? (st.flaws ?? []) : []),
            ].map((q) => q.key)
        )
    );

    for (const key of IMPLEMENTED_QUALITIES)
        if (!carried.has(key) && !GRIM_UNCARRIED.has(key))
            warnings.push(
                `artifacts: ${QUALITY_REGISTRY[key].kind} "${key}" has no carrier`
            );

    return warnings;
}

export function grimInfo(data: WfrpData): string[] {
    const known = new Set(data.units.flatMap(knownSpellsOf));

    return data.spells
        .map((s) => nameOf(s))
        .filter((name) => !known.has(name))
        .map((name) => `info: spells "${name}": known by no unit`);
}

export function grimCoverage(data: WfrpData): string[] {
    const warnings: string[] = [];

    const records = data.careers.map((career) => ({
        career,
        record: read(career),
    }));

    const profiles = data.raceProfiles
        .map((p) => p.profile)
        .filter((p) => p && typeof p === 'object');

    if (profiles.length > 0) {
        const tabled = new Set(
            profiles.flatMap((p) =>
                (p.careerTable ?? []).map((r) => nameKey(r.careerId))
            )
        );

        for (const { career } of records)
            if (!tabled.has(nameKey(nameOf(career))))
                warnings.push(
                    `careers "${nameOf(career)}": not in any species careerTable`
                );
    }

    const used = new Set<string>();

    for (const { record } of records)
        for (const n of TIERS)
            list(record, n, 'talents').forEach((t) => used.add(nameKey(t)));

    for (const p of profiles) {
        (p.talents ?? []).forEach((t) => used.add(nameKey(t)));
        (p.randomTalents ?? []).forEach((r) => used.add(nameKey(r.featId)));
    }

    for (const feat of data.feats)
        if (!used.has(nameKey(nameOf(feat))))
            warnings.push(`feats "${nameOf(feat)}": unused`);

    if (data.careers.length > 0) {
        const advanced = new Set(
            records.flatMap(({ record }) =>
                TIERS.flatMap((n) => list(record, n, 'characteristics'))
            )
        );

        for (const key of CHARACTERISTIC_KEYS)
            if (!advanced.has(key))
                warnings.push(`characteristic "${key}": no career advances it`);
    }

    const merged = mergeRules(
        WFRP_RULES,
        (data.rules ?? {}) as Parameters<typeof mergeRules>[1]
    );

    const ticks = merged.ok
        ? merged.rules.advancement.career.ticksRequired[0]
        : undefined;

    for (const { career, record } of records) {
        const items = (
            ['characteristics', 'skills', 'talents'] as const
        ).reduce((sum, part) => sum + list(record, 1, part).length, 0);

        if (ticks !== undefined && items < ticks)
            warnings.push(
                `careers "${nameOf(career)}": tier 1 lists ${items} items, ticksRequired[0] is ${ticks}`
            );

        const ranks = TIERS.map((n) => statusRank(record, n));

        if (
            ranks.every((r) => r !== null) &&
            ranks.some(
                (r, i) => i > 0 && (r as number) <= (ranks[i - 1] as number)
            )
        )
            warnings.push(
                `careers "${nameOf(career)}": tier statuses do not rise`
            );
    }

    data.raceProfiles.forEach(({ race, profile }) => {
        if (!profile || typeof profile !== 'object') return;

        const fixed = new Set((profile.talents ?? []).map(nameKey));

        const distinct = new Set(
            (profile.randomTalents ?? [])
                .map((r) => nameKey(r.featId))
                .filter((t) => !fixed.has(t))
        ).size;

        if (profile.randomTalentCount > distinct)
            warnings.push(
                `race-profiles "${race}": randomTalentCount ${profile.randomTalentCount} exceeds ${distinct} distinct table talents`
            );
    });

    warnings.push(
        ...unitCoverage(data.units),
        ...spellCoverage(data.spells, data.units),
        ...equipmentCoverage(data.artifacts)
    );

    return warnings;
}
