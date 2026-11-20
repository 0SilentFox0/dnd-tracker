import type { HitSpot } from '../../rules/combat/constants';
import { editionOf } from '../../rules/edition/read';
import {
    FORTUNE_INPUT,
    type FortuneInput,
} from '../../rules/percentile/fortune';

export type FortuneChoice = 'reroll' | 'sl' | 'notFail' | null;

export interface FortuneExtras {
    advantageLabel?: boolean;
    rerolls?: { value: number; set: (n: number) => void };
    notFail?: {
        critical: boolean;
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
        value: input?.kind ?? null,
        onChange: (kind) =>
            write(kind ? FORTUNE_INPUT.write({ kind }) : undefined),
        ...(canon && {
            advantageLabel: true,
            rerolls: {
                value: input?.rerolls ?? 1,
                set: (n) => input && put({ ...input, rerolls: n }),
            },
            notFail: {
                critical: input?.critical === true,
                location: input?.location,
                set: (critical, location) =>
                    input &&
                    put({
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
