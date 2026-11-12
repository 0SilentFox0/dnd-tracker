import {
    CHARACTERISTIC_KEYS,
    type CharacteristicKey,
    SKILL_KEY_RE,
    SPEC_RE,
} from './characteristics/constants';
import { skillTarget, value } from './characteristics/derive';
import { readCharacteristics } from './characteristics/keys';
import { selfTestMod } from './conditions/test-mod';
import {
    DIFFICULTY_KEYS,
    DIFFICULTY_SL,
    type DifficultyKey,
} from './percentile/difficulty';
import { resolvePercentileTest } from './percentile/resolve';
import { skillDef } from './skills/catalog';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/utils/api/content-error';
import type { SheetTestInput } from '@/lib/utils/rules/systems/types';
import type {
    SheetPercentileRollResult,
    SheetRollBody,
} from '@/types/characters';

type WfrpTestBody = { kind: 'test'; difficulty?: DifficultyKey } & (
    | { characteristic: CharacteristicKey }
    | { skill: string; spec?: string }
);

export function acceptsWfrpSheetTest(
    body: SheetRollBody
): body is WfrpTestBody & SheetRollBody {
    if (body.kind !== 'test') return false;

    if (
        body.difficulty !== undefined &&
        !(DIFFICULTY_KEYS as readonly string[]).includes(body.difficulty)
    )
        return false;

    if ('characteristic' in body)
        return (CHARACTERISTIC_KEYS as readonly string[]).includes(
            body.characteristic
        );

    return (
        SKILL_KEY_RE.test(body.skill) &&
        (body.spec === undefined || SPEC_RE.test(body.spec))
    );
}

export function rollWfrpSheetTest({
    participant,
    body,
    character,
    rng,
    t,
    presetRoll,
}: SheetTestInput): SheetPercentileRollResult {
    if (!acceptsWfrpSheetTest(body))
        throw new ContentError(API_ERRORS.ROLL_KIND_MISMATCH, 400);

    const c = readCharacteristics(character);

    const difficulty = body.difficulty ?? 'challenging';

    let label: string;

    let target: number;

    if ('characteristic' in body) {
        label = t(`gameTerms.characteristics.${body.characteristic}.label`);
        target = value(c, body.characteristic as CharacteristicKey);
    } else {
        const skill = skillTarget(c, body.skill, body.spec);

        if (!skill) throw new ContentError(API_ERRORS.ROLL_KIND_MISMATCH, 400);

        if (!skill.trained)
            throw new ContentError(API_ERRORS.SKILL_UNTRAINED, 409);

        const fixed = skillDef(body.skill)?.spec === 'fixed';

        label =
            t(`gameTerms.wfrpSkills.${body.skill}`) +
            (body.spec
                ? ` (${fixed ? t(`gameTerms.wfrpSpecs.${body.skill}.${body.spec}`) : body.spec})`
                : '');
        target = skill.target;
    }

    const r = resolvePercentileTest({
        target: target + selfTestMod(participant, 'test'),
        slModifier: DIFFICULTY_SL[difficulty],
        doubles: false,
        mode: 'normal',
        rng,
        presetRoll,
    });

    return {
        kind: 'percentile',
        label,
        rawRoll: r.rawRoll,
        roll: r.roll,
        reversed: r.reversed,
        target: r.target,
        sl: r.sl,
        outcome: r.outcome,
        auto: r.auto,
        difficulty,
        mode: r.mode,
    };
}
