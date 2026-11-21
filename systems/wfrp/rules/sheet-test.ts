import {
    CHARACTERISTIC_KEYS,
    type CharacteristicKey,
    SKILL_KEY_RE,
    SPEC_RE,
} from './characteristics/constants';
import { skillTarget, value } from './characteristics/derive';
import { readCharacteristics } from './characteristics/keys';
import { participantStats } from './combat/participant';
import { fateLeftOf, fateSpendsOn } from './combat/fate';
import { selfModes, selfSlMod, selfTestMod } from './conditions/test-mod';
import { resolveModeSources } from './percentile/advantage';
import {
    DIFFICULTY_KEYS,
    DIFFICULTY_SL,
    type DifficultyKey,
} from './percentile/difficulty';
import {
    applyFortune,
    forcedOf,
    type FortuneInput,
    SHEET_FORTUNE_KINDS,
    type SheetFortuneKind,
} from './percentile/fortune';
import { resolvePercentileTest } from './percentile/resolve';
import { skillDef } from './skills/catalog';
import { editionOf } from './edition';
import { wfrpState } from './state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ContentError } from '@/lib/utils/api/content-error';
import type {
    SheetTestInput,
    SheetTestResult,
} from '@/lib/utils/rules/systems/types';
import type { SheetRollBody } from '@/types/characters';

type WfrpTestBody = {
    kind: 'test';
    difficulty?: DifficultyKey;
    fortune?: SheetFortuneKind;
    rerolls?: number;
    critical?: boolean;
} & ({ characteristic: CharacteristicKey } | { skill: string; spec?: string });

export function acceptsWfrpSheetTest(
    body: SheetRollBody
): body is WfrpTestBody & SheetRollBody {
    if (body.kind !== 'test') return false;

    if (
        body.difficulty !== undefined &&
        !(DIFFICULTY_KEYS as readonly string[]).includes(body.difficulty)
    )
        return false;

    if (
        body.fortune !== undefined &&
        !(SHEET_FORTUNE_KINDS as readonly string[]).includes(body.fortune)
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
    rules,
    t,
    presetRoll,
}: SheetTestInput): SheetTestResult {
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

    const edition = editionOf(rules);

    const spend = body.fortune;

    const fortuneLeft = spend ? (wfrpState(participant).fortune ?? 0) : 0;

    const fateLeft = spend ? fateLeftOf(participant) : 0;

    if (spend === 'notFail' ? fateLeft < 1 : spend && fortuneLeft < 1)
        throw new ContentError(
            spend === 'notFail' ? API_ERRORS.NO_FATE : API_ERRORS.NO_FORTUNE,
            409
        );

    const reverse = edition.advantageModel === 'reverse';

    const edge = spend === 'advantage';

    const modeOf = resolveModeSources({
        advantage: edge && reverse ? 1 : 0,
        disadvantage: selfModes(
            participant,
            'test',
            edition,
            'skill' in body ? body.skill : undefined
        ).disadvantage,
    });

    const input: FortuneInput | undefined =
        spend === 'advantage'
            ? { kind: 'sl' }
            : spend
              ? {
                    kind: spend,
                    rerolls: Math.min(body.rerolls ?? 1, fortuneLeft),
                    ...(spend === 'notFail' &&
                        body.critical && { critical: true }),
                }
              : undefined;

    const slModifier =
        DIFFICULTY_SL[difficulty] +
        selfSlMod(participant, edition) +
        (edge && !reverse ? 1 : 0) +
        modeOf.slMod +
        ('skill' in body
            ? (participant.abilities
                  ? (participantStats(participant)?.testPenalty?.[body.skill] ??
                    0)
                  : 0)
            : 0);

    const { result: r, fortune } = applyFortune(
        (preset) =>
            resolvePercentileTest({
                target: target + selfTestMod(participant, 'test', edition),
                slModifier,
                doubles: false,
                slModel: edition.slModel,
                mode: modeOf.mode,
                rng,
                presetRoll: preset,
                forced: forcedOf(input),
            }),
        input,
        (t) => t.outcome === 'success' || t.outcome === 'critical',
        presetRoll,
        { repeat: fateSpendsOn(rules) }
    );

    const resourcesAfter = fortune
        ? fortune.kind === 'notFail'
            ? { fate: fateLeft - 1 }
            : { fortune: fortuneLeft - fortune.spent }
        : undefined;

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
        ...(fortune && {
            fortune: {
                kind: fortune.kind === 'sl' ? 'advantage' : fortune.kind,
                ...(fortune.firstRoll !== undefined && {
                    firstRoll: fortune.firstRoll,
                }),
                spent: fortune.spent,
            },
        }),
        ...(resourcesAfter && { resourcesAfter }),
    };
}
