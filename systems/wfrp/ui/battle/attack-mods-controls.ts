import {
    FORTUNE_INPUT,
    type WfrpAttackMods,
} from '../../rules/percentile/fortune';

type Slot = Parameters<typeof FORTUNE_INPUT.read>[0];

type Patch = { [K in keyof WfrpAttackMods]?: WfrpAttackMods[K] | undefined };

/** Situational attack choices kept next to the Fortune input in the same system slot */
export function attackModsControls(
    system: Slot,
    write: (input: ReturnType<typeof FORTUNE_INPUT.write> | undefined) => void
) {
    const input = FORTUNE_INPUT.read(system);

    const mods: WfrpAttackMods = input?.mods ?? {};

    return {
        mods,
        set: (patch: Patch) => {
            const next = Object.fromEntries(
                Object.entries({ ...mods, ...patch }).filter(
                    ([, v]) => v !== undefined
                )
            ) as WfrpAttackMods;

            const { mods: _old, ...rest } = input ?? {
                kind: 'none' as const,
            };

            const plain =
                rest.kind === 'none' && !rest.critBonus && !rest.blessing;

            if (Object.keys(next).length === 0 && plain)
                return write(undefined);

            write(
                FORTUNE_INPUT.write({
                    ...rest,
                    ...(Object.keys(next).length > 0 && { mods: next }),
                })
            );
        },
    };
}
