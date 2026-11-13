// args is the first sweep module loaded: the next/cache stub must be installed before any lib/ import
import { profileOf, SWEEP_PROFILES, type SweepProfile } from './profiles';

import './stub-next-cache';

export function parseTemplateKeys(argv: readonly string[]): SweepProfile[] {
    const at = argv.indexOf('--template');

    if (at < 0) return [...SWEEP_PROFILES];

    const key = argv[at + 1];

    const profile = key ? profileOf(key) : undefined;

    if (!profile)
        throw new Error(
            `Unknown template "${key ?? ''}"; expected one of: ${SWEEP_PROFILES.map((p) => p.key).join(', ')}`
        );

    return [profile];
}

export const keepBattles = (argv: readonly string[]): boolean =>
    argv.includes('--keep-battles');

const LOCAL_DB =
    /^postgres(?:ql)?:\/\/[^@]*@(?:localhost|127\.0\.0\.1):54322\/prodcopy(?:_\w+)?(?:\?.*)?$/;

export function assertLocalProdcopy(url: string | undefined): void {
    if (!LOCAL_DB.test(url ?? ''))
        throw new Error(
            'battle-sweep changes data and creates battles: DATABASE_URL must be localhost:54322/prodcopy'
        );
}
