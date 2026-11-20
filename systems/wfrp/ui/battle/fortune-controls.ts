import type { HitSpot } from '../../rules/combat/constants';
import { editionOf } from '../../rules/edition/read';
import {
    FORTUNE_INPUT,
    type FortuneInput,
    type Situational,
} from '../../rules/percentile/fortune';

const choicesOf = (input: FortuneInput | undefined) => ({
    ...(input?.critBonus && { critBonus: input.critBonus }),
    ...(input?.blessing && { blessing: input.blessing }),
    ...(input?.overcast && { overcast: input.overcast }),
    ...(input?.calledShot && { calledShot: input.calledShot }),
    ...(input?.situational && { situational: input.situational }),
});

export type FortuneChoice = 'reroll' | 'sl' | 'notFail' | null;

export interface FortuneExtras {
    advantageLabel?: boolean;
    rerolls?: { value: number; set: (n: number) => void };
    notFail?: {
        critical: boolean;
        /** Offers the struck-location choice (battle only: a sheet test strikes nobody) */
        withLocation?: boolean;
        location?: HitSpot;
        set: (critical: boolean, location?: HitSpot) => void;
    };
}

/** Canon5e wording and extra inputs (rerolls count, Critical + location) around the stored Fortune input */
export function fortuneControls(
    system: Parameters<typeof FORTUNE_INPUT.read>[0],
    rules: object | null | undefined,
    write: (input: ReturnType<typeof FORTUNE_INPUT.write> | undefined) => void
): FortuneExtras & {
    value: FortuneChoice;
    onChange: (kind: FortuneChoice) => void;
} {
    const input = FORTUNE_INPUT.read(system);

    const canon = editionOf(rules).advantageModel === 'reverse';

    const put = (next: FortuneInput) => write(FORTUNE_INPUT.write(next));

    return {
        value: !input || input.kind === 'none' ? null : input.kind,
        onChange: (kind) => {
            const choices = choicesOf(input);

            write(
                kind
                    ? FORTUNE_INPUT.write({ ...choices, kind })
                    : Object.keys(choices).length
                      ? FORTUNE_INPUT.write({ ...choices, kind: 'none' })
                      : undefined
            );
        },
        ...(canon && {
            advantageLabel: true,
            rerolls: {
                value: input?.rerolls ?? 1,
                set: (n) => input && put({ ...input, rerolls: n }),
            },
            notFail: {
                critical: input?.critical === true,
                withLocation: true,
                location: input?.location,
                set: (critical, location) =>
                    input &&
                    put({
                        ...choicesOf(input),
                        kind: input.kind,
                        ...(critical && {
                            critical,
                            ...(location && { location }),
                        }),
                    }),
            },
        }),
    };
}

export interface CastChoices {
    critBonus?: FortuneInput['critBonus'];
    blessing?: FortuneInput['blessing'];
    overcast?: FortuneInput['overcast'];
    set: (
        next: Pick<FortuneInput, 'critBonus' | 'blessing' | 'overcast'>
    ) => void;
}

/** Cast choices that spend nothing (Critical Casting bonus, Blessing overcast) kept beside the Fortune input */
export function castChoices(
    system: Parameters<typeof FORTUNE_INPUT.read>[0],
    write: (input: ReturnType<typeof FORTUNE_INPUT.write> | undefined) => void
): CastChoices {
    const input = FORTUNE_INPUT.read(system);

    return {
        critBonus: input?.critBonus,
        blessing: input?.blessing,
        overcast: input?.overcast,
        set: (next) => {
            const merged = {
                ...input,
                kind: input?.kind ?? ('none' as const),
                ...next,
            };

            const bare =
                merged.kind === 'none' &&
                !merged.critBonus &&
                !merged.blessing &&
                !merged.overcast;

            write(bare ? undefined : FORTUNE_INPUT.write(merged));
        },
    };
}

export interface SituationalControls {
    calledShot?: HitSpot;
    situational: Situational;
    set: (next: Pick<FortuneInput, 'calledShot' | 'situational'>) => void;
}

/** DM-only attack modifiers (called shot, height, tight space, footing) kept beside the Fortune input */
export function situationalControls(
    system: Parameters<typeof FORTUNE_INPUT.read>[0],
    write: (input: ReturnType<typeof FORTUNE_INPUT.write> | undefined) => void
): SituationalControls {
    const input = FORTUNE_INPUT.read(system);

    return {
        calledShot: input?.calledShot,
        situational: input?.situational ?? {},
        set: (next) => {
            const flags = Object.fromEntries(
                Object.entries(next.situational ?? {}).filter(
                    ([, v]) => v !== undefined
                )
            );

            const { calledShot: _c, situational: _s, ...rest } = input ?? {};

            const merged = {
                ...rest,
                kind: input?.kind ?? ('none' as const),
                ...(next.calledShot && { calledShot: next.calledShot }),
                ...(Object.keys(flags).length > 0 && { situational: flags }),
            };

            const bare =
                merged.kind === 'none' && Object.keys(merged).length === 1;

            write(bare ? undefined : FORTUNE_INPUT.write(merged));
        },
    };
}
