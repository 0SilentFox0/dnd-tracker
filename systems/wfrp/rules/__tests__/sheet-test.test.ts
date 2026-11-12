import { describe, expect, it } from 'vitest';

import { applyWfrpConditionTo } from '../conditions/apply';
import { acceptsWfrpSheetTest, rollWfrpSheetTest } from '../sheet-test';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { makeT } from '@/lib/i18n/test/mock-t';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { ContentError } from '@/lib/utils/api/content-error';
import { mulberry32 } from '@/lib/utils/common/rng';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { SheetTestInput } from '@/lib/utils/rules/systems/types';

const characteristics = {
    base: { ws: 45, ag: 40 },
    advances: { ag: 5 },
    skillAdvances: { 'melee:flail': 5, 'lore:heraldry': 5, dodge: 10 },
};

const input = (
    body: unknown,
    extra: Partial<SheetTestInput> = {}
): SheetTestInput => ({
    participant: {} as never,
    character: { characteristics },
    body: body as never,
    rules: DEFAULT_RULES,
    rng: mulberry32(1),
    inspiration: false,
    t: makeT(),
    presetRoll: 30,
    ...extra,
});

const fails = (body: unknown, status: number, message: string) => {
    try {
        rollWfrpSheetTest(input(body));
        expect.unreachable();
    } catch (error) {
        expect(error).toBeInstanceOf(ContentError);
        expect(error).toMatchObject({ status, message });
    }
};

describe('rollWfrpSheetTest', () => {
    it('participant conditions modify the target', () => {
        const fatigued = applyWfrpConditionTo(makeParticipant({ id: 'a' }), {
            key: 'fatigued',
            levels: 1,
            round: 1,
            sourceName: textRef('battleWfrp.log.removed', {
                target: 'x',
                condition: 'y',
            }),
        }).participant;

        const body = { kind: 'test', characteristic: 'ws' };

        expect(
            rollWfrpSheetTest(input(body, { participant: fatigued })).target
        ).toBe(rollWfrpSheetTest(input(body)).target - 10);
    });

    it('characteristic test defaults to challenging', () => {
        expect(
            rollWfrpSheetTest(input({ kind: 'test', characteristic: 'ws' }))
        ).toMatchObject({
            kind: 'percentile',
            label: 'gameTerms.characteristics.ws.label',
            target: 45,
            roll: 30,
            sl: 1,
            outcome: 'success',
            difficulty: 'challenging',
            mode: 'normal',
        });
    });

    it('difficulty modifies SL', () => {
        expect(
            rollWfrpSheetTest(
                input({
                    kind: 'test',
                    characteristic: 'ws',
                    difficulty: 'hard',
                })
            )
        ).toMatchObject({ sl: 0 + Math.max(0, 4 - 3 - 2), difficulty: 'hard' });
    });

    it('skill uses skillTarget', () => {
        expect(
            rollWfrpSheetTest(input({ kind: 'test', skill: 'dodge' }))
        ).toMatchObject({ target: 55, label: 'gameTerms.wfrpSkills.dodge' });
    });

    it('fixed spec is translated, open spec is shown as entered', () => {
        expect(
            rollWfrpSheetTest(
                input({ kind: 'test', skill: 'melee', spec: 'flail' })
            ).label
        ).toBe('gameTerms.wfrpSkills.melee (gameTerms.wfrpSpecs.melee.flail)');
        expect(
            rollWfrpSheetTest(
                input({ kind: 'test', skill: 'lore', spec: 'heraldry' })
            ).label
        ).toBe('gameTerms.wfrpSkills.lore (heraldry)');
    });

    it('untrained advanced skill is 409', () => {
        fails(
            { kind: 'test', skill: 'channelling' },
            409,
            API_ERRORS.SKILL_UNTRAINED
        );
    });

    it('unknown skill is 400', () => {
        fails(
            { kind: 'test', skill: 'nope' },
            400,
            API_ERRORS.ROLL_KIND_MISMATCH
        );
    });

    it('non-test body is 400', () => {
        fails(
            { kind: 'check', ability: 'strength' },
            400,
            API_ERRORS.ROLL_KIND_MISMATCH
        );
    });
});

describe('acceptsWfrpSheetTest', () => {
    it('accepts known characteristics, skill keys and difficulties', () => {
        expect(
            acceptsWfrpSheetTest({ kind: 'test', characteristic: 'ws' })
        ).toBe(true);
        expect(
            acceptsWfrpSheetTest({
                kind: 'test',
                skill: 'melee',
                spec: 'flail',
                difficulty: 'hard',
            })
        ).toBe(true);
    });

    it('rejects unknown characteristic, bad skill/spec, unknown difficulty and non-test bodies', () => {
        expect(
            acceptsWfrpSheetTest({ kind: 'test', characteristic: 'xx' })
        ).toBe(false);
        expect(acceptsWfrpSheetTest({ kind: 'test', skill: 'Not A Key' })).toBe(
            false
        );
        expect(
            acceptsWfrpSheetTest({ kind: 'test', skill: 'melee', spec: 'BAD' })
        ).toBe(false);
        expect(
            acceptsWfrpSheetTest({
                kind: 'test',
                characteristic: 'ws',
                difficulty: 'impossible',
            })
        ).toBe(false);
        expect(
            acceptsWfrpSheetTest({ kind: 'check', ability: 'strength' })
        ).toBe(false);
    });
});
