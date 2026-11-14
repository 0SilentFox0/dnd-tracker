import { describe, expect, it } from 'vitest';

import {
    NEW_MODULES,
    planAll,
    planRow,
    type RulesRow,
    summarizePlans,
} from '@/scripts/db/lib/backfill-rule-modules-plan';
import {
    parseArgs,
    parseSnapshot,
} from '@/scripts/db/lib/backfill-rule-modules-snapshot';

const row = (rules: unknown, over: Partial<RulesRow> = {}): RulesRow => ({
    table: 'campaigns',
    id: 'c1',
    campaignId: 'c1',
    label: 'c',
    text: typeof rules === 'string' ? rules : JSON.stringify(rules),
    ...over,
});

const modulesAfter = (plan: ReturnType<typeof planRow>) =>
    (plan.afterJson?.system as { modules: string[] } | undefined)?.modules;

describe('planRow', () => {
    it('adds NEW to a partial set and sorts', () => {
        const plan = planRow(
            row({ system: { key: 'dnd5e', modules: ['morale'] } })
        );

        expect(plan.action).toBe('write');
        expect(modulesAfter(plan)).toEqual([
            'deathsaves',
            'inspiration',
            'lair',
            'morale',
            'offhand',
            'opportunity',
        ]);
    });

    it('fills an empty set with NEW', () => {
        const plan = planRow(row({ system: { key: 'homm', modules: [] } }));

        expect(modulesAfter(plan)).toEqual([...NEW_MODULES].sort());
    });

    it('keeps other fields of the row', () => {
        const plan = planRow(
            row({ hp: { x: 1 }, system: { key: 'dnd5e', modules: [] } })
        );

        expect(plan.afterJson).toMatchObject({ hp: { x: 1 } });
    });

    it('leaves rows without modules alone', () => {
        expect(planRow(row({ system: { key: 'dnd5e' } })).action).toBe(
            'unchanged'
        );
    });

    it('leaves wfrp and the bare d20 key alone', () => {
        expect(
            planRow(row({ system: { key: 'wfrp', modules: [] } })).action
        ).toBe('unchanged');
        expect(
            planRow(row({ system: { key: 'd20', modules: [] } })).action
        ).toBe('unchanged');
    });

    it('skips an invalid system and non-objects', () => {
        expect(planRow(row({ system: { key: 'nope' } }))).toMatchObject({
            action: 'skip',
            skip: 'invalidSystem',
        });
        expect(planRow(row('[1]'))).toMatchObject({
            action: 'skip',
            skip: 'notObject',
        });
        expect(planRow(row('not json')).skip).toBe('notObject');
    });

    it('is idempotent: a second plan over the result writes nothing', () => {
        const first = planRow(
            row({ system: { key: 'dnd5e', modules: ['morale'] } })
        );

        const again = planAll([row(JSON.stringify(first.afterJson))]);

        expect(summarizePlans(again).write).toBe(0);
    });
});

describe('summarizePlans', () => {
    it('counts active scenes separately', () => {
        const plans = planAll([
            row({ system: { key: 'dnd5e', modules: [] } }),
            row(
                { system: { key: 'dnd5e', modules: [] } },
                { table: 'battle_scenes', id: 's', status: 'active' }
            ),
        ]);

        expect(summarizePlans(plans)).toMatchObject({
            write: 2,
            activeBattle: 1,
        });
    });
});

describe('cli args and snapshot', () => {
    it('is a dry run by default and guards --force', () => {
        expect(parseArgs([]).mode).toBe('dry');
        expect(() => parseArgs(['--force'])).toThrow();
        expect(parseArgs(['--revert', 'f.json', '--force']).force).toBe(true);
        expect(() => parseArgs(['--apply', '--revert', 'f'])).toThrow();
    });

    it('rejects an invalid snapshot', () => {
        expect(() => parseSnapshot('{"version":2}')).toThrow();
    });
});
