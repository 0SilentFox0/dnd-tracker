import type { CompendiumImportController } from './useCompendiumImport';

type State = CompendiumImportController['state'];

export const COMPENDIUM_STEP_KEYS = [
    'file',
    'categories',
    'check',
    'confirm',
    'result',
] as const;

/** Furthest step the user may open. */
export function compendiumStep({ root, preview, result }: State) {
    if (result) return 4;

    if (preview) return 3;

    return root ? 1 : 0;
}

/** Step the wizard moves to when the flow advances. */
export function compendiumAdvanceStep({ root, preview, result }: State) {
    if (result) return 4;

    if (preview) return 2;

    return root ? 1 : 0;
}
