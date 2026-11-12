import { describe, expect, it } from 'vitest';

import { rollEvent } from '../event';

import { dynamicTextRef } from '@/lib/i18n/text-ref';
import { parseRules } from '@/lib/utils/rules/schema';

const rng = () => 0.5;

describe('rollEvent', () => {
    it('uses the default table', () => {
        const e = rollEvent({ tables: {} }, rng, 5);

        expect(e).toMatchObject({
            index: 0,
            text: dynamicTextRef('wfrpDowntime.events.1'),
            conditions: [],
        });
    });

    it('sums wounds', () => {
        expect(rollEvent({ tables: {} }, rng, 85).wounds).toBe(2);
    });

    it('reads a custom table', () => {
        const e = rollEvent(
            {
                tables: {
                    downtimeEvent: [
                        {
                            max: 100,
                            text: 'Flood',
                            effects: [
                                {
                                    type: 'condition',
                                    key: 'fatigued',
                                    levels: 1,
                                },
                            ],
                        },
                    ],
                },
            },
            rng,
            50
        );

        expect(e).toMatchObject({
            text: 'Flood',
            conditions: [{ key: 'fatigued', levels: 1 }],
        });
    });

    it('falls back to defaults for an invalid section', () => {
        const rules = parseRules({
            system: { key: 'wfrp' },
            tables: { downtimeEvent: [{ max: 50, effects: [] }] },
        });

        expect(rollEvent(rules, rng, 5).text).toEqual(
            dynamicTextRef('wfrpDowntime.events.1')
        );
    });
});
