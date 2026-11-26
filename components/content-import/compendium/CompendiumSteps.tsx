import type {
    CompendiumImportController,
    CompendiumStepId,
} from '@/lib/hooks/compendium-import';

export const COMPENDIUM_STEP_KEYS = [
    'file',
    'categories',
    'check',
    'confirm',
    'result',
] as const;

type State = Pick<
    CompendiumImportController['state'],
    'root' | 'preview' | 'result'
>;

export function compendiumStep({ root, preview, result }: State) {
    if (result) return 4;

    if (preview) return 2;

    return root ? 1 : 0;
}

export function compendiumUnlocked(state: State): CompendiumStepId {
    return (
        state.preview && !state.result ? 4 : compendiumStep(state) + 1
    ) as CompendiumStepId;
}
