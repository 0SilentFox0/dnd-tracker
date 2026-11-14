import { describe, expect, it } from 'vitest';

import { NEW_MODULES } from '@/scripts/db/lib/backfill-rule-modules-plan';
import { reportRows } from '@/scripts/db/lib/rule-modules-report-lib';

const row = (
    system: unknown,
    over: Record<string, string> = {}
): Parameters<typeof reportRows>[0][number] => ({
    table: 'campaigns',
    id: 'x',
    campaignId: 'x',
    label: 'x',
    text: JSON.stringify({ system }),
    ...over,
});

describe('reportRows', () => {
    it('splits empty, partial and full; scenes and active ones apart', () => {
        const report = reportRows([
            row({ key: 'dnd5e', modules: [] }),
            row({ key: 'homm', modules: ['morale'] }),
            row({ key: 'dnd5e', modules: [...NEW_MODULES] }),
            row(
                { key: 'dnd5e', modules: [] },
                { table: 'battle_scenes', status: 'active' }
            ),
            row({ key: 'dnd5e' }),
            row({ key: 'wfrp', modules: [] }),
        ]);

        expect(report.groups.campaigns).toEqual({
            empty: 1,
            partial: 1,
            full: 1,
        });
        expect(report.groups.battle_scenes.empty).toBe(1);
        expect(report.groups.activeScenes.empty).toBe(1);
        expect(report).toMatchObject({ explicit: 4, incomplete: 3 });
    });

    it('counts the bare d20 key but never as incomplete', () => {
        const report = reportRows([row({ key: 'd20', modules: [] })]);

        expect(report).toMatchObject({ explicit: 1, incomplete: 0 });
    });
});
