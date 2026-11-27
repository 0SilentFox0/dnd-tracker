import { describe, expect, it } from 'vitest';

import { groupSharedIps, type SharedIpRow } from '../shared-ip';

const row = (ip: string, userId: string, days: string[]): SharedIpRow => ({
    ip,
    userId,
    country: 'UA',
    device: null,
    days,
});

describe('groupSharedIps', () => {
    it('groups 3 accounts on one ip without the crowd flag', () => {
        const g = groupSharedIps([
            row('1.1.1.1', 'a', []),
            row('1.1.1.1', 'b', []),
            row('1.1.1.1', 'c', []),
        ]);

        expect(g).toHaveLength(1);
        expect(g[0].accounts).toHaveLength(3);
        expect(g[0].crowd).toBe(false);
    });

    it('marks 5 accounts as a crowd', () => {
        const g = groupSharedIps(
            ['a', 'b', 'c', 'd', 'e'].map((u) => row('2.2.2.2', u, []))
        );

        expect(g[0].crowd).toBe(true);
    });

    it('drops an ip with a single account', () => {
        expect(groupSharedIps([row('3.3.3.3', 'a', ['2026-01-01'])])).toEqual(
            []
        );
    });

    it('counts only days with at least two active accounts', () => {
        const g = groupSharedIps([
            row('4.4.4.4', 'a', ['2026-01-01', '2026-01-02', '2026-01-03']),
            row('4.4.4.4', 'b', ['2026-01-02', '2026-01-03', '2026-01-09']),
        ]);

        expect(g[0].sharedDays).toBe(2);
        expect(g[0].accounts[0].days).toBe(3);
    });

    it('sorts by account count, then shared days', () => {
        const g = groupSharedIps([
            row('5.5.5.5', 'a', ['2026-01-01']),
            row('5.5.5.5', 'b', ['2026-01-01']),
            row('6.6.6.6', 'a', []),
            row('6.6.6.6', 'b', []),
            row('7.7.7.7', 'a', []),
            row('7.7.7.7', 'b', []),
            row('7.7.7.7', 'c', []),
        ]);

        expect(g.map((x) => x.ip)).toEqual(['7.7.7.7', '5.5.5.5', '6.6.6.6']);
    });
});
