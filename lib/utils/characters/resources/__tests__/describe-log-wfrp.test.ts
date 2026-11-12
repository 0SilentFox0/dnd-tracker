import { describe, expect, it, vi } from 'vitest';

import { describeCharacterLog } from '@/lib/utils/characters/resources/describe-log';

const getTranslator = async (locale: 'uk' | 'en') =>
    (
        await vi.importActual<typeof import('@/lib/i18n/translator')>(
            '@/lib/i18n/translator'
        )
    ).getTranslator(locale);

describe('describeCharacterLog wfrp', () => {
    const data = {
        label: 'WS',
        rawRoll: 30,
        roll: 30,
        reversed: true,
        target: 45,
        sl: 1,
        outcome: 'success',
        auto: null,
        difficulty: 'challenging',
        mode: 'normal',
    };

    it('test params', () => {
        expect(describeCharacterLog({ kind: 'test', data })).toEqual({
            key: 'rest.log.test',
            params: {
                label: 'WS',
                roll: 30,
                target: 45,
                sl: 1,
                outcome: 'success',
                reversed: 'yes',
                auto: 'none',
                difficulty: 'challenging',
            },
        });
    });

    it('test text in en and uk', async () => {
        const d = describeCharacterLog({ kind: 'test', data });

        expect((await getTranslator('en'))(d.key, d.params)).toBe(
            '🎲 WS: 30 vs 45 · success, SL 1 · reversed'
        );
        expect((await getTranslator('uk'))(d.key, d.params)).toBe(
            '🎲 WS: 30 проти 45 · успіх, РУ 1 · реверс'
        );
    });

    it('auto outcome', () => {
        expect(
            describeCharacterLog({
                kind: 'test',
                data: { ...data, auto: 'failure', reversed: false },
            }).params
        ).toMatchObject({ auto: 'failure', reversed: 'no' });
    });

    it('corruption', () => {
        const params = { points: 2, total: 7, threshold: 6 };

        expect(
            describeCharacterLog({
                kind: 'corruption',
                data: { ...params, mutation: false },
            })
        ).toMatchObject({ key: 'rest.log.corruption', params });
        expect(
            describeCharacterLog({
                kind: 'corruption',
                data: { ...params, mutation: true },
            })
        ).toMatchObject({ key: 'rest.log.corruptionMutation', params });
        expect(
            describeCharacterLog({ kind: 'corruption', data: { undo: true } })
                .key
        ).toBe('rest.log.corruptionUndo');
    });

    it('corruption reason, test and mutation text render in both locales', async () => {
        const text = { message: 'wfrpCorruption.mutations.physical.3' };

        const data = {
            points: 2,
            total: 8,
            threshold: 6,
            mutation: true,
            reason: 'Warpstone',
            summary: {
                test: { roll: 80, target: 40, sl: -4, outcome: 'failure' },
                mutation: { text },
            },
        };

        const d = describeCharacterLog({ kind: 'corruption', data });

        expect(d.params).toMatchObject({
            hasReason: 'yes',
            reason: 'Warpstone',
            testState: 'failed',
            roll: 80,
            target: 40,
            sl: -4,
        });
        expect(d.textParams).toEqual({ mutationText: text });

        const en = await getTranslator('en');

        expect(en(d.key, { ...d.params, mutationText: 'Hooves' })).toBe(
            '☠ Corruption +2 (8/6) · Warpstone · Endurance 80 vs 40, SL -4: failed — mutation: Hooves'
        );

        expect(
            (await getTranslator('uk'))(d.key, {
                ...d.params,
                mutationText: 'Копита',
            })
        ).toContain(
            'Warpstone · Витривалість 80 проти 40, РУ -4: провал — мутація: Копита'
        );

        const plain = describeCharacterLog({
            kind: 'corruption',
            data: { points: 1, total: 1, threshold: 6, mutation: false },
        });

        expect(en(plain.key, { mutationText: '', ...plain.params })).toBe(
            '☠ Corruption +1 (1/6)'
        );
    });

    it('downtime', () => {
        expect(
            describeCharacterLog({
                kind: 'downtime',
                data: { periodId: 'p', days: 7, summary: {} },
            })
        ).toEqual({ key: 'rest.log.downtime', params: { days: 7 } });
        expect(
            describeCharacterLog({
                kind: 'downtime',
                data: { undo: true, days: 7 },
            }).key
        ).toBe('rest.log.downtimeUndo');
    });

    it('session', async () => {
        const d = describeCharacterLog({ kind: 'session', data: {} });

        expect(d).toEqual({ key: 'rest.log.session' });
        expect((await getTranslator('en'))(d.key)).toBe(
            '🎭 New session: Fortune restored'
        );
    });
});
