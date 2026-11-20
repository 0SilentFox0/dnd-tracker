import { describe, expect, it } from 'vitest';

import { readPack } from '../../lib/pack';
import { validatePack } from '../../lib/validate';
import { WFRP_ROW_KINDS, wfrpDataOf } from '../../systems/wfrp/common';
import { grimCoverage, grimInfo } from '../../systems/wfrp/coverage';

import { mulberry32 } from '@/lib/utils/common/rng';
import { nameKey } from '@/lib/utils/content/import';
import { mergeRules } from '@/lib/utils/rules/schema';
import { isSlug } from '@/lib/utils/templates/slug';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';
import { planDraft } from '@/systems/wfrp/rules/creation/plan';
import { rollCreation } from '@/systems/wfrp/rules/creation/roll';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const pack = readPack('grim-d100');

const data = wfrpDataOf(pack);

const MECHANICAL_STATS = ['attackBonus', 'maxHp', 'initiative'];

const abilitiesOf = (feat: Record<string, unknown>) =>
    (feat.abilities ?? []) as Array<{
        trigger: { event: string };
        effects: Array<{ kind: string; stat: string }>;
    }>;

describe('grim-d100 catalog', () => {
    it('icons.json has no stale or invalid entries', () => {
        expect(
            validatePack(pack).filter(
                (issue) =>
                    issue.message.startsWith('icons:') &&
                    issue.level === 'error'
            )
        ).toEqual([]);
    });

    it('passes the validator', () => {
        expect(
            validatePack(pack).filter((issue) => issue.level === 'error')
        ).toEqual([]);
    });

    it('has no coverage warnings', () => {
        expect(grimCoverage(data)).toEqual([]);
    });

    it('units have unique names, a creature type and a level', () => {
        const names = data.units.map((u) => nameKey(String(u.name)));

        expect(new Set(names).size).toBe(names.length);

        for (const unit of data.units) {
            expect(
                (unit.statblock as { creatureType?: string }).creatureType,
                String(unit.name)
            ).toBeTruthy();
            expect(unit.level, String(unit.name)).toBeGreaterThan(0);
        }
    });

    it('units carry no race, attacks or avatar; every known spell resolves', () => {
        const spellNames = new Set(
            data.spells.map((s) => nameKey(String(s.name)))
        );

        for (const unit of data.units) {
            for (const key of ['raceId', 'attacks', 'avatar'])
                expect(unit, `${String(unit.name)}.${key}`).not.toHaveProperty(
                    key
                );

            for (const spell of (unit.knownSpells ?? []) as string[])
                expect(
                    spellNames.has(nameKey(spell)),
                    `${String(unit.name)} knows ${spell}`
                ).toBe(true);
        }
    });

    it('spells and artifacts have unique names; miscast tables are present', () => {
        for (const rows of [data.spells, data.artifacts]) {
            const names = rows.map((r) => nameKey(String(r.name)));

            expect(new Set(names).size).toBe(names.length);
        }

        expect(Object.keys(data.rules?.tables ?? {}).sort()).toEqual([
            'miscastMajor',
            'miscastMinor',
            'wrath',
        ]);
    });

    it('grimInfo does not list spells known by a unit', () => {
        const known = new Set(
            data.units.flatMap((u) => (u.knownSpells ?? []) as string[])
        );

        expect(known.size).toBeGreaterThan(0);

        const info = grimInfo(data).join('\n');

        for (const name of known)
            expect(info, name).not.toContain(`"${name}"`);
    });

    it('every row has a unique valid slug and profiles point at race slugs', () => {
        for (const kind of WFRP_ROW_KINDS) {
            const slugs = data[kind].map((r) => String(r.slug));

            expect(slugs.every(isSlug), kind).toBe(true);
            expect(new Set(slugs).size, kind).toBe(slugs.length);
        }

        expect(new Set(data.raceProfiles.map((p) => p.race))).toEqual(
            new Set(data.races.map((r) => r.slug))
        );
    });

    it('manifest counts match the data', () => {
        const { counts } = pack.manifest;

        expect(counts).toEqual({
            races: data.races.length,
            careers: data.careers.length,
            feats: data.feats.length,
            units: data.units.length,
            spells: data.spells.length,
            artifacts: data.artifacts.length,
        });
        expect(data.raceProfiles).toHaveLength(data.races.length);
    });

    it('feat abilities are passive modifyStat on stats that act on a wfrp hero', () => {
        for (const feat of data.feats)
            for (const ability of abilitiesOf(feat)) {
                expect(ability.trigger.event).toBe('passive');

                for (const effect of ability.effects) {
                    expect(effect.kind).toBe('modifyStat');
                    expect(MECHANICAL_STATS).toContain(effect.stat);
                }
            }
    });

    it('has mechanical feats and origin feats without xpCost', () => {
        expect(
            data.feats.filter((f) => abilitiesOf(f).length > 0).length
        ).toBeGreaterThan(0);

        const origin = data.feats.filter((f) => f.type === 'origin');

        expect(origin.length).toBeGreaterThan(0);
        expect(
            origin.every((f) => f.xpCost === undefined || f.xpCost === null)
        ).toBe(true);
    });

    it('species career tables cover all careers and every profile row resolves', () => {
        const tables = data.raceProfiles.map(
            (p) =>
                new Set(
                    (p.profile.careerTable ?? []).map((r) =>
                        nameKey(r.careerId)
                    )
                )
        );

        const all = new Set(data.careers.map((c) => nameKey(String(c.name))));

        expect(new Set(tables.flatMap((t) => [...t]))).toEqual(all);

        const featNames = new Set(
            data.feats.map((f) => nameKey(String(f.name)))
        );

        for (const { race, profile } of data.raceProfiles) {
            for (const row of profile.careerTable ?? [])
                expect(
                    all.has(nameKey(row.careerId)),
                    `${race}: ${row.careerId}`
                ).toBe(true);

            for (const talent of profile.talents ?? [])
                expect(
                    featNames.has(nameKey(talent)),
                    `${race}: talent ${talent}`
                ).toBe(true);
        }
    });
});

describe('creation e2e', () => {
    const merged = mergeRules(
        WFRP_RULES,
        (data.rules ?? {}) as Parameters<typeof mergeRules>[1]
    );

    if (!merged.ok) throw new Error('rules patch invalid');

    const rules = merged.rules.advancement;

    const careerIds = new Set(data.careers.map((c) => String(c.name)));

    const featIds = new Set(data.feats.map((f) => String(f.name)));

    const ctxOf = (profile: (typeof data.raceProfiles)[number]['profile']) => ({
        profile,
        rules,
        careerIds,
        featIds,
    });

    it.each(data.raceProfiles.map((p, i) => [p.race, i] as const))(
        '%s: every table career plans with rolled stats',
        (_race, speciesIndex) => {
            const { profile } = data.raceProfiles[speciesIndex];

            profile.careerTable.forEach(({ careerId }, rowIndex) => {
                const rolls = rollCreation(
                    mulberry32(1000 * speciesIndex + rowIndex),
                    profile
                );

                const plan = planDraft(
                    {
                        career: { mode: 'choice', careerId },
                        stats: { mode: 'rolled', rolls: rolls.statRolls },
                        talents: rolls.randomTalents,
                    },
                    ctxOf(profile)
                );

                if (!plan.ok)
                    throw new Error(`${careerId}: ${plan.errors.join(',')}`);

                expect(plan.experience).toBe(
                    rules.creation.careerBonus.choice +
                        rules.creation.statBonus.rolled
                );

                CHARACTERISTIC_KEYS.forEach((k, i) =>
                    expect(plan.characteristics.base[k]).toBe(
                        20 + (profile.mods[k] ?? 0) + rolls.statRolls[i]
                    )
                );

                expect(plan.characteristics.career?.careerId).toBe(careerId);

                for (const talent of [
                    ...profile.talents,
                    ...rolls.randomTalents,
                ])
                    expect(
                        plan.characteristics.talents[talent]
                    ).toBeGreaterThan(0);
            });
        }
    );

    it.each(data.raceProfiles.map((p, i) => [p.race, i] as const))(
        '%s: rolled career and free stats plan',
        (_race, speciesIndex) => {
            const { profile } = data.raceProfiles[speciesIndex];

            const rolls = rollCreation(
                mulberry32(1000 * speciesIndex),
                profile
            );

            expect(
                planDraft(
                    {
                        career: {
                            mode: 'rolled',
                            careerId: rolls.careerRolls[0].careerId,
                        },
                        stats: { mode: 'rolled', rolls: rolls.statRolls },
                        talents: rolls.randomTalents,
                    },
                    ctxOf(profile)
                ).ok
            ).toBe(true);

            const free = planDraft(
                {
                    career: {
                        mode: 'choice',
                        careerId: profile.careerTable[0].careerId,
                    },
                    stats: {
                        mode: 'free',
                        points: Array(10).fill(rules.creation.freeBudget / 10),
                    },
                    talents: [],
                },
                ctxOf(profile)
            );

            expect(free.ok).toBe(true);
        }
    );
});
