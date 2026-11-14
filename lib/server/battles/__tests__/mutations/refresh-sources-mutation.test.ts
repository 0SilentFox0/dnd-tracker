import { describe, expect, it, vi } from 'vitest';

import { context, participant } from './fixtures';

import { ParticipantSide } from '@/lib/constants/battle';
import { createRefreshSourcesMutation } from '@/lib/server/battles/mutations/refresh-sources/refresh-sources-mutation';
import { resolved } from '@/lib/utils/abilities/__tests__/fixtures';
import { eventTextOf } from '@/lib/utils/battle/log/__tests__/event-text';
import { toReserve } from '@/lib/utils/battle/participant/reserve';

const fresh = (id: string) => {
    const p = participant(id);

    return {
        ...p,
        battleData: {
            ...p.battleData,
            resolvedAbilities: [
                resolved(
                    { trigger: { event: 'passive' }, effects: [] },
                    { id: 'fresh' }
                ),
            ],
        },
    };
};

function deps(over = {}) {
    return {
        loadCharacter: vi.fn(async (id: string) =>
            id === 'gone' ? null : ({ id, campaignId: 'c1' } as never)
        ),
        loadUnit: vi.fn(async (id: string) =>
            id === 'gone' ? null : ({ id, campaignId: 'c1' } as never)
        ),
        loadRace: vi.fn(async () => null),
        fromCharacter: vi.fn(async () => fresh('x')),
        fromUnit: vi.fn(async () => fresh('x')),
        buildContext: vi.fn(async () => undefined),
        ...over,
    };
}

const hero = participant('hero', { sourceType: 'character', sourceId: 'ch1' });

const gob = participant('gob', {
    sourceType: 'unit',
    sourceId: 'u1',
    side: ParticipantSide.ENEMY,
    instanceNumber: 1,
});

const gob2 = participant('gob2', {
    sourceType: 'unit',
    sourceId: 'u1',
    side: ParticipantSide.ENEMY,
    instanceNumber: 2,
});

describe('refresh-sources mutation', () => {
    it('refreshes characters, units and reserve; loads each source once', async () => {
        const d = deps();

        const out = await createRefreshSourcesMutation(d)(
            context({
                participants: [hero, gob, gob2],
                pending: [
                    toReserve(
                        participant('res', {
                            sourceType: 'unit',
                            sourceId: 'u1',
                        })
                    ),
                ],
            })
        );

        expect(d.loadUnit).toHaveBeenCalledTimes(1);
        expect(d.fromUnit).toHaveBeenCalledTimes(3);
        expect(
            out.participants.every(
                (p) => p.battleData.resolvedAbilities[0]?.source.id === 'fresh'
            )
        ).toBe(true);
        expect(out.pending[0].battleData.reserved).toBe(true);
        expect(out.pending[0].battleData.resolvedAbilities[0]?.source.id).toBe(
            'fresh'
        );
        expect(eventTextOf(out.events[0])).toBe(
            'Оновлено з бібліотеки: 4 учасників'
        );
    });

    it('builds a unit with its race loaded by raceId', async () => {
        const race = { id: 'r1', name: 'Elf' } as never;

        const d = deps({
            loadUnit: vi.fn(
                async (id: string) =>
                    ({ id, campaignId: 'c1', raceId: 'r1' }) as never
            ),
            loadRace: vi.fn(async () => race),
        });

        await createRefreshSourcesMutation(d)(
            context({ participants: [gob] })
        );

        expect(d.loadRace).toHaveBeenCalledWith('r1', 'c1');
        expect(
            (d.fromUnit.mock.calls[0] as unknown[])[4]
        ).toEqual({ r1: race });
    });

    it('loads a shared race once for many units', async () => {
        const d = deps({
            loadUnit: vi.fn(
                async (id: string) =>
                    ({ id, campaignId: 'c1', raceId: 'r1' }) as never
            ),
        });

        await createRefreshSourcesMutation(d)(
            context({
                participants: [
                    gob,
                    gob2,
                    participant('gob3', {
                        sourceType: 'unit',
                        sourceId: 'u2',
                        side: ParticipantSide.ENEMY,
                        instanceNumber: 1,
                    }),
                ],
            })
        );

        expect(d.loadRace).toHaveBeenCalledTimes(1);
    });

    it('skips missing sources, extra-turn slots, summons and other campaigns', async () => {
        const d = deps({
            loadUnit: vi.fn(async (id: string) =>
                id === 'other' ? ({ id, campaignId: 'c2' } as never) : null
            ),
        });

        const missing = participant('m', {
            sourceType: 'unit',
            sourceId: 'gone',
        });

        const foreign = participant('f', {
            sourceType: 'unit',
            sourceId: 'other',
        });

        const slot = participant('s', {
            sourceType: 'character',
            sourceId: 'ch1',
            isExtraTurnSlot: true,
        });

        const base = participant('sum', { sourceType: 'unit', sourceId: 'u1' });

        const summon = {
            ...base,
            battleData: { ...base.battleData, summonedBy: 'hero' },
        };

        const out = await createRefreshSourcesMutation(d)(
            context({ participants: [hero, missing, foreign, slot, summon] })
        );

        expect(eventTextOf(out.events[0])).toBe(
            'Оновлено з бібліотеки: 1 учасників'
        );
        expect(out.participants.map((p) => p.basicInfo.id)).toEqual([
            'hero',
            'm',
            'f',
            's',
            'sum',
        ]);
        expect(out.participants[1]).toBe(missing);
    });

    it('героїв перебудовують з контекстом кампанії, збудованим один раз', async () => {
        const campaignContext = { artifactsById: { a1: {} } } as never;

        const d = deps({ buildContext: vi.fn(async () => campaignContext) });

        await createRefreshSourcesMutation(d)(
            context({
                participants: [
                    hero,
                    participant('hero2', {
                        sourceType: 'character',
                        sourceId: 'ch2',
                    }),
                    gob,
                ],
            })
        );

        expect(d.buildContext).toHaveBeenCalledTimes(1);
        expect(d.buildContext).toHaveBeenCalledWith('c1', [
            expect.objectContaining({ id: 'ch1' }),
            expect.objectContaining({ id: 'ch2' }),
        ]);
        expect(d.fromCharacter).toHaveBeenCalledTimes(2);
        expect(
            (d.fromCharacter.mock.calls as unknown[][]).every(
                (c) => c[4] === campaignContext
            )
        ).toBe(true);
    });
});
