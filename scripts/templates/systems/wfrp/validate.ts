import type { Pack } from '../../lib/pack';
import type { PackIssue } from '../types';
import {
    type NamedProfile,
    type Row,
    type WfrpData,
    wfrpDataOf,
} from './common';
import { equipmentIssues } from './equipment';
import { FORBIDDEN_CONDITIONS, spellIssues, unitSpellIssues } from './spells';
import { unitIssues } from './units';

import {
    CAREER_TIER_COUNT,
    careerTierKey,
} from '@/lib/constants/import-aliases';
import { isRecord } from '@/lib/utils/common/is-record';
import {
    coerceRecord,
    IMPORT_SPECS,
    nameKey,
} from '@/lib/utils/content/import';
import { SPEC_RE } from '@/systems/wfrp/rules/characteristics/keys';
import { skillDef } from '@/systems/wfrp/rules/skills/catalog';
import type { TableRow } from '@/systems/wfrp/rules/tables/schema';
import { SpeciesProfileSchema } from '@/systems/wfrp/server/schemas';

const label = (kind: string, index: number, name: unknown) =>
    `${kind} #${index + 1}${typeof name === 'string' ? ` "${name}"` : ''}`;

const PROFILE_KEYS = [
    'mods',
    'move',
    'fate',
    'extraWounds',
    'talents',
    'randomTalentCount',
    'randomTalents',
    'careerTable',
] as const;

const PROFILE_LISTS = ['talents', 'randomTalents', 'careerTable'] as const;

const FEAT_STATS = ['attackBonus', 'maxHp', 'initiative'];

const STATUS_RE = /^(brass|silver|gold)\s+[1-9]$/i;

const exactName = (row: Row) => (typeof row.name === 'string' ? row.name : '');

function validateProfiles(
    data: WfrpData,
    names: { races: Set<string>; careers: Set<string>; feats: Set<string> },
    issues: string[]
) {
    const seen = new Set<string>();

    data.raceProfiles.forEach(({ race, profile }, index) => {
        const where = `race-profiles #${index + 1} "${race}"`;

        if (!names.races.has(race)) issues.push(`${where}: unknown race`);

        if (seen.has(nameKey(race))) issues.push(`${where}: duplicate profile`);

        seen.add(nameKey(race));

        if (!isRecord(profile))
            return void issues.push(`${where}: profile must be an object`);

        const badList = PROFILE_LISTS.filter(
            (key) => key in profile && !Array.isArray(profile[key])
        );

        for (const key of badList)
            issues.push(`${where}: profile "${key}" must be an array`);

        if (badList.length > 0) return;

        const fakeId = (
            kind: 'career' | 'feat',
            set: Set<string>,
            name: string
        ) => {
            if (!set.has(name))
                issues.push(`${where}: unknown ${kind} "${name}"`);

            return `${kind}:${nameKey(name)}`;
        };

        const named = profile as NamedProfile;

        const resolved = {
            ...named,
            talents: (named.talents ?? []).map((t) =>
                fakeId('feat', names.feats, t)
            ),
            randomTalents: (named.randomTalents ?? []).map((r) => ({
                ...r,
                featId: fakeId('feat', names.feats, r.featId),
            })),
            careerTable: (named.careerTable ?? []).map((r) => ({
                ...r,
                careerId: fakeId('career', names.careers, r.careerId),
            })),
        };

        const parsed = SpeciesProfileSchema.safeParse(resolved);

        if (!parsed.success)
            for (const i of parsed.error.issues)
                issues.push(
                    `${where}: ${i.path.join('.') || 'profile'} ${i.message}`
                );
    });
}

export function careerSkillIssue(value: string): string | null {
    const [key, spec] = value.split(':');

    const def = skillDef(key);

    if (!def) return 'unknown skill';

    if (def.spec === 'none')
        return spec === undefined ? null : 'takes no specialisation';

    if (spec === undefined) return 'needs a specialisation';

    if (def.spec === 'fixed')
        return def.specs?.includes(spec) ? null : 'unknown specialisation';

    return SPEC_RE.test(spec) ? null : 'unknown specialisation';
}

function validateCareerTiers(data: WfrpData, issues: string[]) {
    data.careers.forEach((row, index) => {
        const { value } = coerceRecord(row, IMPORT_SPECS.careers.fields);

        const where = label('careers', index, row.name);

        for (let n = 1; n <= CAREER_TIER_COUNT; n++) {
            const skills = value[careerTierKey(n, 'skills')];

            for (const skill of Array.isArray(skills)
                ? skills.map(String)
                : []) {
                const issue = careerSkillIssue(skill);

                if (issue)
                    issues.push(
                        `${where}: ${careerTierKey(n, 'skills')} "${skill}" ${issue}`
                    );
            }

            const status = value[careerTierKey(n, 'status')];

            if (
                typeof status === 'string' &&
                status !== '' &&
                !STATUS_RE.test(status.trim())
            )
                issues.push(
                    `${where}: ${careerTierKey(n, 'status')} "${status}" is not "<Brass|Silver|Gold> <1-9>"`
                );
        }
    });
}

function validateProfileKeys(data: WfrpData, issues: string[]) {
    data.raceProfiles.forEach(({ race, profile }, index) => {
        if (!isRecord(profile)) return;

        for (const key of PROFILE_KEYS)
            if (!(key in profile))
                issues.push(
                    `race-profiles #${index + 1} "${race}": profile missing "${key}"`
                );
    });
}

function validateFeatAbilities(data: WfrpData, issues: string[]) {
    data.feats.forEach((row, index) => {
        const abilities = Array.isArray(row.abilities) ? row.abilities : [];

        abilities.forEach((ability: unknown, n) => {
            const where = `${label('feats', index, row.name)}: abilities[${n}]`;

            const { trigger, effects } = (isRecord(ability) ? ability : {}) as {
                trigger?: { event?: unknown };
                effects?: unknown;
            };

            if (trigger?.event !== 'passive')
                issues.push(
                    `${where}: only a passive trigger acts on a wfrp hero`
                );

            for (const effect of Array.isArray(effects) ? effects : []) {
                const { kind, stat } = (isRecord(effect) ? effect : {}) as {
                    kind?: unknown;
                    stat?: unknown;
                };

                if (
                    kind !== 'modifyStat' ||
                    typeof stat !== 'string' ||
                    !FEAT_STATS.includes(stat)
                )
                    issues.push(
                        `${where}: only modifyStat on ${FEAT_STATS.join('/')} acts on a wfrp hero`
                    );
            }
        });
    });
}

export const GRIM_TABLE_SLOTS = [
    'miscastMinor',
    'miscastMajor',
    'wrath',
] as const;

export const GRIM_TABLE_ROWS: readonly [number, number] = [8, 10];

export const TABLE_TEXT_MAX = 120;

export function tableIssues(rules: WfrpData['rules']): string[] {
    const tables = (
        rules as { tables?: Record<string, TableRow[] | null> } | undefined
    )?.tables;

    if (!tables) return [];

    const issues: string[] = [];

    for (const [slot, rows] of Object.entries(tables)) {
        if (!(GRIM_TABLE_SLOTS as readonly string[]).includes(slot)) {
            issues.push(
                `rules: tables.${slot} is not used by the Grim template`
            );

            continue;
        }

        if (!Array.isArray(rows)) continue;

        const [min, max] = GRIM_TABLE_ROWS;

        if (rows.length < min || rows.length > max)
            issues.push(
                `rules: tables.${slot} must have ${min}–${max} rows (got ${rows.length})`
            );

        rows.forEach((row, i) => {
            if (
                typeof row.text !== 'string' ||
                row.text.length < 1 ||
                row.text.length > TABLE_TEXT_MAX
            )
                issues.push(
                    `rules: tables.${slot}[${i}] needs text of 1–${TABLE_TEXT_MAX} characters`
                );

            for (const e of row.effects ?? [])
                if (
                    e.type === 'condition' &&
                    FORBIDDEN_CONDITIONS.includes(e.key)
                )
                    issues.push(
                        `rules: tables.${slot}[${i}] condition "${e.key}" is not allowed`
                    );
        });
    }

    return issues;
}

function validateRules(rules: WfrpData['rules'], issues: string[]) {
    issues.push(...tableIssues(rules));
}

function validateSpells(data: WfrpData, issues: string[]) {
    data.spells.forEach((row, index) => {
        for (const issue of spellIssues(row))
            issues.push(`${label('spells', index, row.name)}: ${issue}`);
    });
}

function validateArtifacts(data: WfrpData, issues: string[]) {
    data.artifacts.forEach((row, index) => {
        for (const issue of equipmentIssues(row))
            issues.push(`${label('artifacts', index, row.name)}: ${issue}`);
    });
}

function validateUnits(data: WfrpData, issues: string[]) {
    const spellsByName = new Map(data.spells.map((s) => [String(s.name), s]));

    data.units.forEach((row, index) => {
        for (const issue of [
            ...unitIssues(row),
            ...unitSpellIssues(row, spellsByName),
        ])
            issues.push(`${label('units', index, row.name)}: ${issue}`);
    });
}

export function wfrpIssues(data: WfrpData): string[] {
    const issues: string[] = [];

    const names = {
        races: new Set(
            data.races.flatMap((r) =>
                typeof r.slug === 'string' ? [r.slug] : []
            )
        ),
        careers: new Set(data.careers.map(exactName)),
        feats: new Set(data.feats.map(exactName)),
    };

    validateProfiles(data, names, issues);
    validateRules(data.rules, issues);
    validateCareerTiers(data, issues);
    validateProfileKeys(data, issues);
    validateFeatAbilities(data, issues);
    validateSpells(data, issues);
    validateUnits(data, issues);
    validateArtifacts(data, issues);

    return issues;
}

export const validateWfrpPack = (pack: Pack): PackIssue[] =>
    wfrpIssues(wfrpDataOf(pack)).map((message) => ({
        level: 'error',
        message,
    }));
