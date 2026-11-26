import { describe, expect, it } from 'vitest';

import { parseVercelCharges } from '../vercel-charges';

const jsonl = (rows: object[]) => rows.map((r) => JSON.stringify(r)).join('\n');

describe('parseVercelCharges', () => {
    it('sums cost, bandwidth and invocations for the project only', () => {
        const usage = parseVercelCharges(
            jsonl([
                {
                    ServiceName: 'Fast Data Transfer',
                    ConsumedQuantity: '2',
                    ConsumedUnit: 'GB',
                    EffectiveCost: '1',
                    Tags: { ProjectId: 'p1' },
                },
                {
                    ServiceName: 'Function Invocations',
                    ConsumedQuantity: 1.5,
                    ConsumedUnit: 'Million',
                    EffectiveCost: 0.5,
                    Tags: { ProjectId: 'p1' },
                },
                {
                    ServiceName: 'Fast Data Transfer',
                    ConsumedQuantity: 100,
                    ConsumedUnit: 'GB',
                    EffectiveCost: 9,
                    Tags: { ProjectId: 'p2' },
                },
            ]),
            'p1'
        );

        expect(usage).toEqual({
            costUsd: 1.5,
            bandwidthBytes: 2 * 1024 ** 3,
            invocations: 1_500_000,
        });
    });

    it('leaves usage null when no row matches or the unit is unknown', () => {
        const usage = parseVercelCharges(
            jsonl([
                {
                    ServiceName: 'Fast Data Transfer',
                    ConsumedQuantity: 1,
                    ConsumedUnit: 'parsec',
                    EffectiveCost: 2,
                },
                {
                    ServiceName: 'Builds',
                    ConsumedQuantity: 5,
                    EffectiveCost: 1,
                },
            ])
        );

        expect(usage).toEqual({
            costUsd: 3,
            bandwidthBytes: null,
            invocations: null,
        });
    });
});
